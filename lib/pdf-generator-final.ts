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
      /* Embedded Devanagari font for reliable rendering in serverless environments */
      @font-face {
        font-family: 'DevanagariFont';
        src: url('data:font/woff2;charset=utf-8;base64,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') format('woff2');
        
        font-weight: normal;
        font-style: normal;
        unicode-range: U+0900-097F, U+1CD0-1CFF, U+200C-200D, U+20A8, U+20B9, U+25CC, U+A830-A839, U+A8E0-A8FF;
      }
    </style>
    <style>
        @page {
            margin: 15mm 10mm;
            size: A4;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'DevanagariFont', 'Noto Sans Devanagari', 'Noto Sans', 'Mangal', 'Shree Devanagari 714', 'Kokila', 'Utsaah', Arial, sans-serif;
            font-size: 11px;
            line-height: 1.2;
            color: #000;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }
        .marathi-text, .marathi-content {
            font-family: 'DevanagariFont', 'Noto Sans Devanagari', 'Mangal', 'Shree Devanagari 714', 'Kokila', 'Utsaah', 'Noto Sans', Arial, sans-serif;
            direction: ltr;
            unicode-bidi: normal;
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
        .ipd-box { border: 1px solid #000; padding: 6px 10px; text-align: center; font-weight: bold; min-width: 70px; font-size: 12px; line-height: 1.1; }
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
            <div class="ipd-box">IPD No.<br>${patient.ipdNo || 'TBD'}</div>
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
    
    // Wait for fonts to load (faster than networkidle0)
    console.log('Waiting for fonts to load...')
    await page.evaluateHandle('document.fonts.ready').catch(() => {})
    console.log('document.fonts.ready completed')
    
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
      testDiv.style.fontFamily = "'DevanagariFont', 'Noto Sans Devanagari', 'Mangal'"
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