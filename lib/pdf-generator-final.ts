import puppeteer from 'puppeteer-core'
import type { Browser } from 'puppeteer-core'
import chromium from '@sparticuz/chromium'
import fs from 'fs'
import { formatDate, formatTimeWithAmPm } from './utils'
import { WardChargesModel } from './sheets-models'

// Cache for ward charges to avoid repeated API calls
let wardChargesCache: any[] | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

// Browser instance caching for better performance
let browserInstance: Browser | null = null
let browserLastUsed: number = 0
const BROWSER_TIMEOUT = 2 * 60 * 1000 // 2 minutes

interface PatientWithMarathi {
  id: string
  ipdNo: string | null
  uhidNo: string | null
  firstName: string
  middleName: string | null
  surname: string
  firstNameMarathi: string
  middleNameMarathi: string | null
  surnameMarathi: string
  phoneNo: string
  age: number
  sex: 'M' | 'F'
  address: string
  nearestRelativeName: string
  relationToPatient: string
  ward: 'GENERAL' | 'SEMI' | 'SPECIAL_WITHOUT_AC' | 'SPECIAL_WITH_AC_DELUXE' | 'ICU'
  cashless: boolean
  tpa: string | null
  insuranceCompany: string | null
  other: string | null
  admittedByDoctor: string
  treatingDoctor: string | null
  dateOfAdmission: string
  timeOfAdmission: string
  dateOfDischarge: string | null
  timeOfDischarge: string | null
  createdAt: string
  updatedAt: string
}

interface PDFGenerationOptions {
  patient: PatientWithMarathi
  wardCharges?: {
    bedCharges: number | string
    doctorCharges: number | string
    nursingCharges: number | string
    asstDoctorCharges: number | string
    totalPerDay: number | string
    monitorCharges?: number | string
    o2Charges?: number | string
    syringePumpCharges?: number | string
    bloodTransfusionCharges?: number | string
    visitingCharges?: number | string
  }
}

const wardDisplayNames: Record<string, string> = {
  'GENERAL': 'G.W.',
  'SEMI': 'Semi',
  'SPECIAL_WITHOUT_AC': 'Special without AC',
  'SPECIAL_WITH_AC_DELUXE': 'Special with AC (Deluxe)',
  'ICU': 'ICU'
}

// Helper function to format charge values (handles both numbers and ranges)
const formatChargeValue = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) return '0'
  return value.toString()
}

// Helper function to get cached ward charges or fetch fresh data
const getCachedWardCharges = async () => {
  const now = Date.now()
  
  // Return cached data if it's still fresh
  if (wardChargesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return wardChargesCache
  }
  
  // Fetch fresh data and cache it
  const wardChargesFromSheets = await WardChargesModel.findMany()
  wardChargesCache = wardChargesFromSheets.map(ward => ({
    wardType: ward.wardType,
    displayName: wardDisplayNames[ward.wardType] || ward.wardType,
    bedCharges: ward.bedCharges,
    doctorCharges: ward.doctorCharges,
    nursingCharges: ward.nursingCharges,
    asstDoctorCharges: ward.asstDoctorCharges,
    totalPerDay: ward.totalPerDay
  }))
  cacheTimestamp = now
  
  return wardChargesCache
}

// Helper function to get or create browser instance
const getBrowserInstance = async (): Promise<Browser> => {
  const now = Date.now()
  
  // Check if we have a valid cached browser
  if (browserInstance && (now - browserLastUsed) < BROWSER_TIMEOUT) {
    try {
      // Test if browser is still connected
      await browserInstance.version()
      browserLastUsed = now
      return browserInstance
    } catch {
      // Browser is disconnected, close and recreate
      try { await browserInstance.close() } catch {}
      browserInstance = null
    }
  }
  
  // Create new browser instance
  try {
    console.log('Launching Chromium with font support args...')
    const executablePath = await chromium.executablePath()
    console.log('Chromium executable path:', executablePath)
    
    const launchArgs = [
      ...chromium.args,
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--font-render-hinting=none',
      '--enable-font-antialiasing',
      '--force-color-profile=srgb',
      '--disable-features=VizDisplayCompositor'
    ]
    console.log('Launch args:', launchArgs)
    
    browserInstance = await puppeteer.launch({
      args: launchArgs,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: true,
      ignoreHTTPSErrors: true,
    })
    console.log('Chromium launched successfully')
  } catch (err: any) {
    const envPath = process.env.CHROME_EXECUTABLE_PATH
    let localExecutablePath: string | undefined = envPath && fs.existsSync(envPath) ? envPath : undefined
    if (!localExecutablePath) {
      if (process.platform === 'darwin') {
        const macCandidates = [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
        ]
        localExecutablePath = macCandidates.find(p => fs.existsSync(p))
      } else if (process.platform === 'win32') {
        const winCandidates = [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        ]
        localExecutablePath = winCandidates.find(p => fs.existsSync(p))
      } else {
        const linuxCandidates = [
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium',
        ]
        localExecutablePath = linuxCandidates.find(p => fs.existsSync(p))
      }
    }
    if (!localExecutablePath) {
      throw new Error('Local Chrome executable not found. Set CHROME_EXECUTABLE_PATH or install Google Chrome.')
    }
    browserInstance = await puppeteer.launch({ 
      executablePath: localExecutablePath, 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--font-render-hinting=none',
        '--enable-font-antialiasing',
        '--force-color-profile=srgb'
      ]
    })
  }
  
  browserLastUsed = now
  return browserInstance
}

export const generateAdmissionPDF = async ({ patient, wardCharges }: PDFGenerationOptions): Promise<Buffer> => {
  console.log('=== PDF GENERATION DEBUG START ===')
  console.log('Patient Marathi names:', {
    firstNameMarathi: patient.firstNameMarathi,
    middleNameMarathi: patient.middleNameMarathi,
    surnameMarathi: patient.surnameMarathi
  })
  
  // Get ward charges (cached or fresh)
  const allWardCharges = await getCachedWardCharges()
  
  // Fallback to static data if no ward charges found in Google Sheets
  if (allWardCharges.length === 0) {
    console.warn('No ward charges found in Google Sheets, using fallback static data')
    allWardCharges.push(
      { wardType: 'GENERAL', displayName: 'G.W.', bedCharges: 1000, doctorCharges: 400, nursingCharges: 300, asstDoctorCharges: 200, totalPerDay: 1700 },
    { wardType: 'SEMI', displayName: 'Semi', bedCharges: 1400, doctorCharges: 500, nursingCharges: 300, asstDoctorCharges: 300, totalPerDay: 2500 },
    { wardType: 'SPECIAL_WITHOUT_AC', displayName: 'Special without AC', bedCharges: 2200, doctorCharges: 600, nursingCharges: 400, asstDoctorCharges: 300, totalPerDay: 3500 },
    { wardType: 'SPECIAL_WITH_AC_DELUXE', displayName: 'Special with AC (Deluxe)', bedCharges: 2600, doctorCharges: 600, nursingCharges: 500, asstDoctorCharges: 300, totalPerDay: 4000 },
    { wardType: 'ICU', displayName: 'ICU', bedCharges: 2000, doctorCharges: 700, nursingCharges: 600, asstDoctorCharges: 400, totalPerDay: 3700 }
    )
  }
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Cum Admission - Zawar Hospital</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&family=Noto+Sans+Devanagari:wght@400;700&display=swap" rel="stylesheet">
    <style>
      /* Import Google Fonts directly for reliability */
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;700&display=swap');
      
      /* Comprehensive font fallback system for Devanagari */
      .marathi-text, .devanagari {
        font-family: 'Noto Sans Devanagari', 'Mangal', 'Kokila', 'Utsaah', 'Aparajita', 'Sanskrit Text', 'Devanagari Sangam MN', 'Shree Devanagari 714', system-ui, sans-serif !important;
        font-weight: normal;
        font-variant-ligatures: normal;
        font-feature-settings: normal;
        text-rendering: optimizeLegibility;
      }
    </style>
    <style>
        @page {
            margin: 15mm 10mm;
            size: A4;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Noto Sans Devanagari', 'Noto Sans', 'Mangal', 'Shree Devanagari 714', 'Kokila', 'Utsaah', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.2;
            color: #000;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .marathi-text, .marathi-content {
            font-family: 'Noto Sans Devanagari', 'Mangal', 'Shree Devanagari 714', 'Kokila', 'Utsaah', 'Noto Sans', Arial, sans-serif !important;
            direction: ltr;
            unicode-bidi: normal;
            font-weight: normal;
            text-rendering: optimizeLegibility;
        }
        .container { width: 100%; max-width: 190mm; margin: 0 auto; border: 2px solid #000; padding: 10px; background: white; }
        /* Header Section */
        .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; position: relative; }
        .logo-section { display: flex; align-items: center; width: 200px; }
        .logo-container { display: flex; align-items: center; }
        .logo-image { height: 60px; width: auto; margin-right: 15px; }
        .hospital-text { display: flex; flex-direction: column; }
        .hospital-name { font-size: 19px; font-weight: bold; line-height: 1.1; margin-bottom: 3px; }
        .hospital-line { width: 120px; height: 2px; background: #000; }
        .registration-badge { background: #000; color: white; padding: 6px 12px; border-radius: 15px; font-weight: bold; font-size: 13px; position: absolute; left: 50%; transform: translateX(-50%); }
        .id-boxes { display: flex; gap: 10px; }
        .ipd-box, .uhid-box { border: 1px solid #000; padding: 6px 10px; text-align: center; font-weight: bold; min-width: 70px; font-size: 12px; line-height: 1.1; }
        /* Patient Information Table */
        .patient-info { margin: 12px 0; clear: both; }
        .info-table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
        .info-table td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; font-size: 12px; }
        .label { background: #f5f5f5; font-weight: bold; width: 16.66%; }
        .value { width: 16.66%; }
        .marathi-text { font-size: 13px; margin-bottom: 1px; }
        /* Terms and Conditions */
        .terms-section { margin: 15px 0; border: 1px solid #000; padding: 8px; clear: both; }
        .term-item { margin-bottom: 6px; font-size: 13px; line-height: 1.3; }
        /* Payee Slip */
        .payee-section { margin: 30px 0 20px 0; border: 1px solid #000; padding: 8px; clear: both; }
        .payee-header { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 6px; border: 1px solid #000; padding: 3px; }
        .charges-table { width: 100%; border-collapse: collapse; border: 2px solid #000; table-layout: fixed; }
        .charges-table th, .charges-table td { border: 1px solid #000; padding: 4px 3px; text-align: center; font-size: 12px; word-wrap: break-word; }
        .charges-table th { background: #f5f5f5; font-weight: bold; vertical-align: middle; }
        .charges-table th:nth-child(1) { width: 7%; }
        .charges-table th:nth-child(2) { width: 15%; }
        .charges-table th:nth-child(3) { width: 10%; }
        .charges-table th:nth-child(4) { width: 10%; }
        .charges-table th:nth-child(5) { width: 10%; }
        .charges-table th:nth-child(6) { width: 10%; }
        .charges-table th:nth-child(7) { width: 12%; }
        .charges-table th:nth-child(8) { width: 18%; }
        .charges-table th:nth-child(9) { width: 8%; }
        .monitor-charges { text-align: center; margin: 6px 0; font-weight: bold; font-size: 13px; }
        .rates-section { text-align: center; margin: 8px 0; font-size: 12px; font-weight: bold; }
        .signature-lines { margin: 15px 0; font-size: 12px; clear: both; }
        .signature-row { display: flex; justify-content: space-between; margin: 3px 0; }
        /* Page Break */
        .page-break { page-break-before: always; margin-top: 0; }
        /* Appendix B */
        .appendix-section { margin: 20px 0; border: 1px solid #000; padding: 12px; clear: both; }
        .appendix-header { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 8px; }
        .diagnosis-section { margin: 8px 0; }
        .diagnosis-line { border-bottom: 1px solid #000; height: 15px; margin: 4px 0; }
        .marathi-content { font-size: 13px; line-height: 1.4; margin: 8px 0; }
        /* Final Signatures */
        .final-signatures { display: flex; justify-content: space-between; margin-top: 15px; font-size: 12px; }
        .signature-block { text-align: center; width: 45%; }
        .signature-line { border-bottom: 1px solid #000; height: 25px; margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <div class="logo-container">
                    <img src="data:image/png;base64,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" 
                        alt="ZH Hospital Logo" 
                            style="width:67px; height:auto;" />
                        <div class="hospital-text">
                        <div class="hospital-name">Zawar Hospital</div>
                        <div class="hospital-line"></div>
                    </div>
                </div>
            </div>
            <div class="registration-badge">REGISTRATION CUM ADMISSION</div>
            <div class="id-boxes">
            <div class="ipd-box">IPD No.<br>${patient.ipdNo || 'TBD'}</div>
                <div class="uhid-box">UHID No.<br>${patient.uhidNo || 'TBD'}</div>
            </div>
        </div>
        
        <!-- Patient Information -->
        <div class="patient-info">
            <table class="info-table">
                <tr>
                    <td class="label">
                        <div class="marathi-text">नाव</div>
                        <div>First Name</div>
                    </td>
                    <td class="value">
                        ${patient.firstName}<br>
                        <span class="marathi-text">${patient.firstNameMarathi || ''}</span>
                    </td>
                    <td class="label">
                        <div class="marathi-text">मधले नाव</div>
                        <div>Middle Name</div>
                    </td>
                    <td class="value">
                        ${patient.middleName || ''}<br>
                        <span class="marathi-text">${patient.middleNameMarathi || ''}</span>
                    </td>
                    <td class="label">
                        <div class="marathi-text">आडनाव</div>
                        <div>Surname</div>
                    </td>
                    <td class="value">
                        ${patient.surname}<br>
                        <span class="marathi-text">${patient.surnameMarathi || ''}</span>
                    </td>
                </tr>
                <tr>
                    <td class="label">
                        <div class="marathi-text">जवळचे नातेवाईक</div>
                        <div>Nearest Relative Name</div>
                    </td>
                    <td class="value">${patient.nearestRelativeName}</td>
                    <td class="label">
                        <div class="marathi-text">पेशंटशी नाते</div>
                        <div>Relation to Patient</div>
                    </td>
                    <td class="value">${patient.relationToPatient}</td>
                    <td class="label">
                        <div class="marathi-text">फोन नं.</div>
                        <div>Ph. No.</div>
                    </td>
                    <td class="value">${patient.phoneNo}</td>
                </tr>
                <tr>
                    <td class="label">
                        <div class="marathi-text">पत्ता</div>
                        <div>Address</div>
                    </td>
                    <td class="value" colspan="3">${patient.address}</td>
                    <td class="label">
                        <div class="marathi-text">वय / लिंग</div>
                        <div>Age / Sex</div>
                    </td>
                    <td class="value">${patient.age} ${patient.sex}</td>
                </tr>
                <tr>
                    <td class="label">
                        <div class="marathi-text">वार्ड</div>
                        <div>Ward</div>
                    </td>
                    <td class="value">${wardDisplayNames[patient.ward] || patient.ward}</td>
                    <td class="label">
                        <span style="margin-right: 5px;">${patient.cashless ? '☑' : '☐'}</span>
                        <div class="marathi-text">कॅशलेस</div>
                        <div>Cashless</div>
                    </td>
                    <td class="value">${patient.cashless ? 'Yes' : 'No'}</td>
                    <td class="label">
                        <div class="marathi-text">इतर</div>
                        <div>Other</div>
                    </td>
                    <td class="value">${patient.other || ''}</td>
                </tr>
                ${patient.cashless ? `
                <tr>
                    <td class="label">
                        <div class="marathi-text">विमा कंपनी</div>
                        <div>Insurance Company</div>
                    </td>
                    <td class="value">${patient.insuranceCompany || ''}</td>
                    <td class="label">
                        <div>TPA</div>
                    </td>
                    <td class="value" colspan="3">${patient.tpa || ''}</td>
                </tr>
                ` : ''}
                <tr>
                    <td class="label">
                        <div class="marathi-text">डॉक्टरांचे नाव</div>
                        <div>Admitted by doctor</div>
                    </td>
                    <td class="value">${patient.admittedByDoctor}</td>
                    <td class="label">
                        <div class="marathi-text">दाखल केल्याची तारीख</div>
                        <div>Date of Admission :</div>
                    </td>
                    <td class="value">${formatDate(patient.dateOfAdmission)}</td>
                    <td class="label">
                        <div class="marathi-text">वेळ</div>
                        <div>Time</div>
                    </td>
                    <td class="value">${formatTimeWithAmPm(patient.timeOfAdmission)}</td>
                </tr>
                <tr>
                    <td class="label">Treating Doctor :</td>
                    <td class="value">${patient.treatingDoctor || ''}</td>
                    <td class="label">
                        <div class="marathi-text">सोडण्याची तारीख</div>
                        <div>Date of Discharge :</div>
                    </td>
                    <td class="value">${patient.dateOfDischarge ? formatDate(patient.dateOfDischarge) : ''}</td>
                    <td class="label">
                        <div class="marathi-text">वेळ</div>
                        <div>Time</div>
                    </td>
                    <td class="value">${patient.timeOfDischarge ? formatTimeWithAmPm(patient.timeOfDischarge) : ''}</td>
                </tr>
            </table>
        </div>
        
        <!-- Terms and Conditions -->
        <div class="terms-section">
            <div class="term-item marathi-text"><strong>१)</strong> रुग्णालयातील वास्तव्यामध्ये सध्या अस्तित्वात असणाऱ्या रुग्णालयांच्या सर्व अटी व नियमांचे पालन मी करेन.</div>
            <div class="term-item marathi-text"><strong>२)</strong> रुग्णाला रुग्णालयातून घेऊन जाण्याची जबाबदारी माझी राहील.</div>
            <div class="term-item marathi-text"><strong>३)</strong> रुग्णाला ज्या प्रवर्गात दाखल करावयाचे आहे त्या प्रवर्गाला मोबदल्याची मला पूर्ण कल्पना दिली असून सर्व रक्कम मी भरण्यास तयार आहे व त्यानंतर रुग्णाला दाखल करून घेतले जाईल.</div>
            <div class="term-item marathi-text"><strong>४)</strong> मी रुग्णास माझ्या जबाबदारीवर या रुग्णालयात दाखल करीत आहे. रुग्णावर उपचार करणाऱ्या डॉक्टरवर माझा विश्वास आहे व त्याचेकडून उपचार करून घेण्यास माझी संमती आहे.</div>
            <div class="term-item"><strong>1.</strong> I have read the rules & regulation of the hospital presently in force and I agree to abide by them and the additions and alternations made therein from time to time. I will be responsible for payment of the hospital bill of the patient.</div>
            <div class="term-item"><strong>2.</strong> I will be responsible to take away the patient when discharge.</div>
            <div class="term-item"><strong>3.</strong> I have been explained the charges for the class in which the patient seeks admission & have agreed to pay the same.</div>
            <div class="term-item"><strong>4.</strong> I have faith in doctors who are treating the patient. I am admitting the patient in your hospital here willingly & on my responsibility.</div>
        </div>
        
        <!-- Signature Section -->
        <div style="margin: 25px 0; display: flex; justify-content: space-between; font-size: 13px; clear: both;">
            <div style="width: 45%;">
                <div style="font-weight: bold; margin-bottom: 20px;">Signature of Relative (Legal Guardian)</div>
                <div style="margin-bottom: 8px;">Date :</div>
                <div style="margin-bottom: 8px;">Patient Name :</div>
                <div style="margin-bottom: 8px;">Hospital Name :</div>
                <div style="margin-bottom: 8px;">Name & Relationship</div>
                <div>(In cases where Consent is provided by him)</div>
            </div>
            <div style="width: 45%;">
                <div style="font-weight: bold; margin-bottom: 20px;">Signature of Hospital Staff</div>
                <div style="margin-bottom: 8px;">Date :</div>
                <div style="margin-bottom: 8px;">Name :</div>
                <div style="margin-bottom: 8px;">Designation :</div>
            </div>
        </div>
    </div>
    
    <!-- Page 2 - Payee Slip and Appendix B -->
    <div class="page-break">
        <div class="container">
            <!-- Payee Slip -->
            <div class="payee-section">
                <div class="payee-header">PAYEE SLIP</div>
                <table class="charges-table">
                    <thead>
                        <tr>
                            <th>Sr. No.</th><th>Ward</th><th>Bed Charges</th><th>Doctor Charges</th><th>Nursing Charges</th><th>Asst. Doctor</th><th>Total</th><th>नातेवाईकांचे नाव</th><th>सही</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allWardCharges.map((ward, index) => `
                        <tr>
                            <td>${index + 1})</td>
                            <td>${ward.displayName}</td>
                            <td>${formatChargeValue(ward.bedCharges)}</td>
                            <td>${formatChargeValue(ward.doctorCharges)}</td>
                            <td>${formatChargeValue(ward.nursingCharges)}</td>
                            <td>${formatChargeValue(ward.asstDoctorCharges)}</td>
                            <td>${formatChargeValue(ward.totalPerDay)}/day</td>
                            <td></td>
                            <td></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                <div class="monitor-charges">
                    <strong>Monitor- ${formatChargeValue(wardCharges?.monitorCharges)}/day &nbsp;&nbsp;&nbsp;&nbsp; O2- ${formatChargeValue(wardCharges?.o2Charges)}/day</strong><br>
                    <strong>Syringe Pump- ${formatChargeValue(wardCharges?.syringePumpCharges)}/day &nbsp;&nbsp;&nbsp;&nbsp; Blood Transfusion- ${formatChargeValue(wardCharges?.bloodTransfusionCharges)}/day</strong><br>
                    <strong>Visiting Charges- ${formatChargeValue(wardCharges?.visitingCharges)}/day</strong>
                </div>
                <div class="rates-section">Rates Applicable As Per Existing Hospital Schedule In Force</div>
                <div class="signature-lines">
                    <div class="signature-row"><span>Name : _______________________________________</span></div>
                    <div class="signature-row"><span>Relation : ____________________________</span></div>
                    <div class="signature-row"><span>Sign. __________________</span></div>
                </div>
            </div>
            <!-- Appendix B -->
            <div class="appendix-section">
                <div class="appendix-header">परिशिष्ट "ब" -</div>
                <div class="marathi-content">मी / आम्ही रुग्णावर दि. &nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp; / २० &nbsp;&nbsp;&nbsp; पासून दि. &nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp; / २० &nbsp;&nbsp;&nbsp; पर्यंत औषधोपचार करीत आहे / आहोत. आज रोजी घरी जाण्यास परवानगी देत आहोत.</div>
                <div class="diagnosis-section" style="margin: 15px 0px;">
                    <div style="margin-bottom: 10px;"><strong>Final Diagnosis</strong> ____________________________________________________________________________________________________________________</div>
                    <div style="margin-bottom: 10px;">______________________________________________________________________________________________________________________________________</div>
                    <div style="margin-bottom: 10px;">______________________________________________________________________________________________________________________________________</div>
                    <div style="margin-bottom: 10px;">______________________________________________________________________________________________________________________________________</div>
                    <div style="margin-bottom: 10px;">______________________________________________________________________________________________________________________________________</div>
                </div>
                <div class="marathi-content">
                    <div style="margin: 15px 0px;">
                        <div style="margin: 5px 0;"><strong>तज्ज्ञ वैद्यकीय अधिकारी डॉ.</strong> ____________________</div><br>
                        <div style="margin: 5px 0;"><strong>स्वाक्षरी</strong> __________________________&nbsp;&nbsp;&nbsp;<strong>दि.</strong> &nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp; / २० &nbsp;&nbsp;&nbsp;&nbsp; <strong>वेळ :</strong> __________</div>
                    </div>
                    <div style="margin: 15px 0px;">मी खाली सही करणारे ___________________________________________ &nbsp;&nbsp;&nbsp;दि. &nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp; / २०</div>
                    <div class="marathi-content">रोजी उपनिर्दिष्ट रुग्णालयात मी दाखल होताना असलेल्या माझ्या सर्व तक्रारींचे समाधानकारक निवारण झाल्यानंतर घरी जात आहे. हॉस्पिटलमध्ये असताना मला सर्व प्रकारची जरुर ती उपचार पद्धती आणि सेवा मिळाली. घरी जाण्यास परवानगी दिल्यानंतर मला वैद्यकीय सल्ला, डिस्चार्ज कार्ड, बिले व पावत्या रुग्णालयीन तपासण्यांचे कागद मिळाले, त्याबद्दल मी पूर्ण समाधानानी असून माझी कोणतीही तक्रार नाही.</div>
                </div>
                <div style="margin-top: 25px;"><div style="margin-bottom: 10px;"><strong>रुग्णाची सही</strong> ____________________</div><div><strong>नातेवाईकाची सही</strong> ____________________</div></div>
            </div>
        </div>
    </div>
</body>
</html>
  `

  // Log HTML content for debugging (first 1000 chars of Marathi content)
  const marathiContentMatch = html.match(/firstNameMarathi[\s\S]*?surnameMarathi[\s\S]{0,200}/)
  console.log('HTML Marathi content sample:', marathiContentMatch ? marathiContentMatch[0] : 'Not found')
  
  // Use cached browser instance for better performance
  const browser = await getBrowserInstance()
  const page = await browser.newPage()
  
  try {
    console.log('Setting page viewport and content...')
    // Optimize page settings for faster rendering
    await page.setViewport({ width: 1200, height: 1600 })
    
    // Set content with faster wait condition
    await page.setContent(html, { waitUntil: 'domcontentloaded' })
    console.log('HTML content loaded successfully')
    
    // Wait for fonts to load with aggressive strategy
    console.log('Waiting for fonts to load...')
    
    // Force load Google Fonts and wait for completion
    await page.evaluate(() => {
      return new Promise((resolve) => {
        // Create a more robust font loading mechanism
        const fontFaces = [
          new FontFace('Noto Sans Devanagari', 'url(https://fonts.gstatic.com/s/notosansdevanagari/v25/TuGoUUFzXI5FBtUq5a8bjKYTZjtRU6Sgv3NaV_ufkZBVZpoQf8JXZ_Uw.woff2)'),
        ]
        
        const fontPromises = fontFaces.map(fontFace => {
          document.fonts.add(fontFace)
          return fontFace.load()
        })
        
        Promise.all(fontPromises)
          .then(() => document.fonts.ready)
          .then(() => {
            // Extra verification wait
            setTimeout(resolve, 500)
          })
          .catch(() => {
            // Fallback - just wait for document fonts
            document.fonts.ready.then(() => setTimeout(resolve, 500))
          })
        
        // Ultimate fallback
        setTimeout(resolve, 3000)
      })
    })
    
    console.log('Google Fonts loading completed')
    
    // Check available fonts and font loading status
    const fontInfo = await page.evaluate(() => {
      const fonts = Array.from(document.fonts.values()).map(font => ({
        family: font.family,
        status: font.status,
        style: font.style,
        weight: font.weight
      }))
      
      // Check if our embedded font is available
      const testDiv = document.createElement('div')
      testDiv.innerHTML = 'अविकिरण बाळासाहेब खेळे'
      testDiv.style.fontFamily = "'Noto Sans Devanagari', 'Mangal', 'Shree Devanagari 714'"
      testDiv.style.fontSize = '16px'
      testDiv.style.position = 'absolute'
      testDiv.style.top = '-1000px'
      document.body.appendChild(testDiv)
      
      const computedStyle = window.getComputedStyle(testDiv)
      const actualFont = computedStyle.fontFamily
      const textContent = testDiv.textContent
      
      document.body.removeChild(testDiv)
      
      return {
        availableFonts: fonts,
        actualFontUsed: actualFont,
        testText: textContent,
        fontCount: fonts.length
      }
    })
    
    console.log('Font debugging info:', fontInfo)
    
    // Additional wait for Devanagari fonts to ensure proper rendering
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        const testDiv = document.createElement('div')
        testDiv.innerHTML = 'अविकिरण बाळासाहेब खेळे'
        testDiv.style.fontFamily = "'DevanagariFont', 'Noto Sans Devanagari', 'Mangal', 'Shree Devanagari 714'"
        testDiv.style.visibility = 'hidden'
        testDiv.style.position = 'absolute'
        document.body.appendChild(testDiv)
        
        // Give fonts time to load
        setTimeout(() => {
          document.body.removeChild(testDiv)
          resolve()
        }, 200)
      })
    })
    console.log('Font loading wait completed')
    
    // Final check - capture the actual rendered content with Marathi text
    const marathiTextCheck = await page.evaluate(() => {
      const marathiElements = Array.from(document.querySelectorAll('[class*="marathi"], [style*="Devanagari"]'))
      return marathiElements.map(el => ({
        tagName: el.tagName,
        className: el.className,
        textContent: el.textContent?.substring(0, 100),
        computedFont: window.getComputedStyle(el).fontFamily
      }))
    })
    
    console.log('Marathi text elements in DOM:', marathiTextCheck)
    
    // Generate PDF with optimized settings
    console.log('Starting PDF generation...')
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      printBackground: true, 
      margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
      timeout: 30000 // 30 second timeout
    })
    console.log('PDF generated successfully, size:', pdfBuffer.length, 'bytes')
    console.log('=== PDF GENERATION DEBUG END ===')
    return Buffer.from(pdfBuffer)
  } finally {
    // Close only the page, keep browser alive for reuse
    await page.close()
  }
}