import puppeteer from 'puppeteer'
import { formatDate, formatTimeWithAmPm } from './utils'

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
    bedCharges: number
    doctorCharges: number
    nursingCharges: number
    asstDoctorCharges: number
    totalPerDay: number
    monitorCharges?: number
    o2Charges?: number
  }
}

const wardDisplayNames: Record<string, string> = {
  'GENERAL': 'G.W.',
  'SEMI': 'Semi',
  'SPECIAL_WITHOUT_AC': 'Special without AC',
  'SPECIAL_WITH_AC_DELUXE': 'Special with AC (Deluxe)',
  'ICU': 'ICU'
}

export const generateAdmissionPDF = async ({ patient, wardCharges }: PDFGenerationOptions): Promise<Buffer> => {
  
  // All ward charges for the payee slip table
  const allWardCharges = [
    { wardType: 'GENERAL', displayName: 'G.W.', bedCharges: 800, doctorCharges: 400, nursingCharges: 300, asstDoctorCharges: 200, totalPerDay: 1700 },
    { wardType: 'SEMI', displayName: 'Semi', bedCharges: 1400, doctorCharges: 500, nursingCharges: 300, asstDoctorCharges: 300, totalPerDay: 2500 },
    { wardType: 'SPECIAL_WITHOUT_AC', displayName: 'Special without AC', bedCharges: 2200, doctorCharges: 600, nursingCharges: 400, asstDoctorCharges: 300, totalPerDay: 3500 },
    { wardType: 'SPECIAL_WITH_AC_DELUXE', displayName: 'Special with AC (Deluxe)', bedCharges: 2600, doctorCharges: 600, nursingCharges: 500, asstDoctorCharges: 300, totalPerDay: 4000 },
    { wardType: 'ICU', displayName: 'ICU', bedCharges: 2000, doctorCharges: 700, nursingCharges: 600, asstDoctorCharges: 400, totalPerDay: 3700 }
  ]
  
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Registration Cum Admission - Zawar Hospital</title>
    <style>
        @page {
            margin: 15mm 10mm;
            size: A4;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: Arial, sans-serif;
            font-size: 13px;
            line-height: 1.2;
            color: #000;
        }
        
        .container {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
            border: 2px solid #000;
            padding: 10px;
            background: white;
        }
        
        /* Header Section */
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
            position: relative;
        }
        
        .logo-section {
            display: flex;
            align-items: center;
            width: 200px;
        }
        
        .logo-container {
            display: flex;
            align-items: center;
        }
        
        .logo-circle {
            width: 60px;
            height: 60px;
            border: 2px solid #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 15px;
            position: relative;
        }
        
        .inner-circle {
            width: 45px;
            height: 45px;
            border: 1px solid #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            font-weight: bold;
        }
        
        .hospital-text {
            display: flex;
            flex-direction: column;
        }
        
        .hospital-name {
            font-size: 19px;
            font-weight: bold;
            line-height: 1.1;
            margin-bottom: 3px;
        }
        
        .hospital-line {
            width: 120px;
            height: 2px;
            background: #000;
        }
        
        .registration-badge {
            background: #000;
            color: white;
            padding: 6px 12px;
            border-radius: 15px;
            font-weight: bold;
            font-size: 13px;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
        }
        
        .ipd-box {
            border: 1px solid #000;
            padding: 6px 10px;
            text-align: center;
            font-weight: bold;
            min-width: 70px;
            font-size: 12px;
            line-height: 1.1;
        }
        
        /* Patient Information Table */
        .patient-info {
            margin: 12px 0;
            clear: both;
        }
        
        .info-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000;
        }
        
        .info-table td {
            border: 1px solid #000;
            padding: 4px 6px;
            vertical-align: top;
            font-size: 12px;
        }
        
        .label {
            background: #f5f5f5;
            font-weight: bold;
            width: 16.66%;
        }
        
        .value {
            width: 16.66%;
        }
        
        .marathi-text {
            font-size: 13px;
            margin-bottom: 1px;
        }
        
        /* Terms and Conditions */
        .terms-section {
            margin: 15px 0;
            border: 1px solid #000;
            padding: 8px;
            clear: both;
        }
        
        .term-item {
            margin-bottom: 6px;
            font-size: 13px;
            line-height: 1.3;
        }
        
        .term-item.marathi-text {
            font-size: 13px;
        }
        
        /* Payee Slip */
        .payee-section {
            margin: 20px 0;
            border: 1px solid #000;
            padding: 8px;
            clear: both;
        }
        
        .payee-header {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 6px;
            border: 1px solid #000;
            padding: 3px;
        }
        
        .charges-table {
            width: 100%;
            border-collapse: collapse;
            border: 2px solid #000;
            table-layout: fixed;
        }
        
        .charges-table th,
        .charges-table td {
            border: 1px solid #000;
            padding: 4px 3px;
            text-align: center;
            font-size: 12px;
            word-wrap: break-word;
        }
        
        .charges-table th {
            background: #f5f5f5;
            font-weight: bold;
            vertical-align: middle;
        }
        
        .charges-table th:nth-child(1) { width: 7%; }  /* Sr. No. */
        .charges-table th:nth-child(2) { width: 15%; } /* Ward */
        .charges-table th:nth-child(3) { width: 10%; } /* Bed Charges */
        .charges-table th:nth-child(4) { width: 10%; } /* Doctor Charges */
        .charges-table th:nth-child(5) { width: 10%; } /* Nursing Charges */
        .charges-table th:nth-child(6) { width: 10%; } /* Asst. Doctor */
        .charges-table th:nth-child(7) { width: 12%; } /* Total */
        .charges-table th:nth-child(8) { width: 18%; } /* नातेवाईकांचे नाव */
        .charges-table th:nth-child(9) { width: 8%; }  /* सही */
        
        .monitor-charges {
            text-align: center;
            margin: 6px 0;
            font-weight: bold;
            font-size: 13px;
        }
        
        .rates-section {
            text-align: center;
            margin: 8px 0;
            font-size: 12px;
            font-weight: bold;
        }
        
        .signature-lines {
            margin: 15px 0;
            font-size: 12px;
            clear: both;
        }
        
        .signature-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
        }
        
        /* Page Break */
        .page-break {
            page-break-before: always;
            margin-top: 0;
        }
        
        /* Appendix B */
        .appendix-section {
            margin: 20px 0;
            border: 1px solid #000;
            padding: 12px;
            clear: both;
        }
        
        .appendix-header {
            text-align: center;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 8px;
        }
        
        .diagnosis-section {
            margin: 8px 0;
        }
        
        .diagnosis-line {
            border-bottom: 1px solid #000;
            height: 15px;
            margin: 4px 0;
        }
        
        .marathi-content {
            font-size: 13px;
            line-height: 1.4;
            margin: 8px 0;
        }
        
        /* Final Signatures */
        .final-signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            font-size: 12px;
        }
        
        .signature-block {
            text-align: center;
            width: 45%;
        }
        
        .signature-line {
            border-bottom: 1px solid #000;
            height: 25px;
            margin: 8px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <div class="logo-section">
                <div class="logo-container">
                    <div class="logo-circle">
                        <div class="inner-circle">ZH</div>
                    </div>
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
                    <td class="value" colspan="2">${patient.relationToPatient}</td>
                </tr>
                <tr>
                    <td class="label">
                        <div class="marathi-text">पत्ता</div>
                        <div>Address</div>
                    </td>
                    <td class="value" colspan="3">${patient.address}</td>
                    <td class="label">
                        <div class="marathi-text">फोन नं.</div>
                        <div>Ph. No.</div>
                    </td>
                    <td class="value">${patient.phoneNo}</td>
                </tr>
                <tr>
                    <td class="label">
                        <div class="marathi-text">वय</div>
                        <div>Age</div>
                    </td>
                    <td class="value">${patient.age}</td>
                    <td class="label">
                        <div class="marathi-text">लिंग</div>
                        <div>Sex : M / F</div>
                    </td>
                    <td class="value">${patient.sex}</td>
                    <td class="label">
                        <div class="marathi-text">वार्ड</div>
                        <div>Ward</div>
                    </td>
                    <td class="value">${wardDisplayNames[patient.ward] || patient.ward}</td>
                </tr>
                <tr>
                    <td class="label">
                        <span style="margin-right: 5px;">${patient.cashless ? '☑' : '☐'}</span>
                        <div class="marathi-text">कॅशलेस</div>
                        <div>Cashless</div>
                    </td>
                    <td class="value">${patient.other || ''}</td>
                    <td class="label">
                        <div class="marathi-text">इतर</div>
                        <div>Other</div>
                    </td>
                    <td class="value" colspan="2"></td>
                </tr>
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
            <div class="term-item marathi-text">
                <strong>१)</strong> रुग्णालयातील वास्तव्यामध्ये सध्या अस्तित्वात असणाऱ्या रुग्णालयांच्या सर्व अटी व नियमांचे पालन मी करेन.
            </div>
            <div class="term-item marathi-text">
                <strong>२)</strong> रुग्णाला रुग्णालयातून घेऊन जाण्याची जबाबदारी माझी राहील.
            </div>
            <div class="term-item marathi-text">
                <strong>३)</strong> रुग्णाला ज्या प्रवर्गात दाखल करावयाचे आहे त्या प्रवर्गाला मोबदल्याची मला पूर्ण कल्पना दिली असून सर्व रक्कम मी भरण्यास तयार आहे व त्यानंतर रुग्णाला दाखल करून घेतले जाईल.
            </div>
            <div class="term-item marathi-text">
                <strong>४)</strong> मी रुग्णास माझ्या जबाबदारीवर या रुग्णालयात दाखल करीत आहे. रुग्णावर उपचार करणाऱ्या डॉक्टरवर माझा विश्वास आहे व त्याचेकडून उपचार करून घेण्यास माझी संमती आहे.
            </div>
            
            <div class="term-item" style="margin-top: 12px;">
                <strong>1.</strong> I have read the rules & regulation of the hospital presently in force and I agree to abide by them and the 
                additions and alternations made therein from time to time. I will be responsible for payment of the hospital bill 
                of the patient.
            </div>
            <div class="term-item">
                <strong>2.</strong> I will be responsible to take away the patient when discharge.
            </div>
            <div class="term-item">
                <strong>3.</strong> I have been explained the charges for the class in which the patient seeks admission & have agreed to 
                pay the same.
            </div>
            <div class="term-item">
                <strong>4.</strong> I have faith in doctors who are treating the patient. I am admitting the patient in your hospital here willingly 
                & on my responsibility.
            </div>
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
                            <th>Sr. No.</th>
                            <th>Ward</th>
                            <th>Bed Charges</th>
                            <th>Doctor Charges</th>
                            <th>Nursing Charges</th>
                            <th>Asst. Doctor</th>
                            <th>Total</th>
                            <th>नातेवाईकांचे नाव</th>
                            <th>सही</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${allWardCharges.map((ward, index) => `
                        <tr>
                            <td>${index + 1})</td>
                            <td>${ward.displayName}</td>
                            <td>${ward.bedCharges}</td>
                            <td>${ward.doctorCharges}</td>
                            <td>${ward.nursingCharges}</td>
                            <td>${ward.asstDoctorCharges}</td>
                            <td>${ward.totalPerDay}/day</td>
                            <td></td>
                            <td></td>
                        </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="monitor-charges">
                    <strong>Monitor- 1000/day &nbsp;&nbsp;&nbsp;&nbsp; O2- 1500/day</strong>
                </div>
                
                <div class="rates-section">
                    Rates Applicable As Per Existing Hospital Schedule In Force
                </div>
                
                <div class="signature-lines">
                    <div class="signature-row">
                        <span>Name : _______________________________________</span>
                    </div>
                    <div class="signature-row">
                        <span>Relation : ____________________________</span>
                    </div>
                    <div class="signature-row">
                        <span>Sign. __________________</span>
                    </div>
                </div>
            </div>
            
            <!-- Appendix B -->
            <div class="appendix-section">
                <div class="appendix-header">परिशिष्ट "ब" -</div>
                
                <div class="marathi-content">
                    मी / आम्ही रुग्णावर दि. &nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp; / २० &nbsp;&nbsp;&nbsp; पासून दि. &nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp; / २० &nbsp;&nbsp;&nbsp; पर्यंत औषधोपचार करीत आहे / आहोत. आज रोजी घरी जाण्यास परवानगी देत आहोत.
                </div>
                
                <div class="diagnosis-section" style="margin: 15px 0px;">
                    <div style="margin-bottom: 10px;"><strong>Final Diagnosis</strong> ___________________________________________________________________________________________</div>
                    <div style="margin-bottom: 10px;">___________________________________________________________________________________________</div>
                    <div style="margin-bottom: 10px;">___________________________________________________________________________________________</div>
                    <div style="margin-bottom: 10px;">___________________________________________________________________________________________</div>
                    <div style="margin-bottom: 10px;">___________________________________________________________________________________________</div>
                </div>
                
                <div class="marathi-content">
                    <div style="margin: 15px 0px;">
                        <div style="margin: 5px 0;"><strong>तज्ज्ञ वैद्यकीय अधिकारी डॉ.</strong> ____________________</div><br>
                        <div style="margin: 5px 0;"><strong>स्वाक्षरी</strong> __________________________&nbsp;&nbsp;&nbsp;<strong>दि.</strong> &nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp; / २० &nbsp;&nbsp;&nbsp;&nbsp; <strong>वेळ :</strong> __________</div>
                    </div>
                    
                    <div style="margin: 15px 0px;">
                        मी खाली सही करणारे ___________________________________________
                        &nbsp;&nbsp;&nbsp;दि. &nbsp;&nbsp;&nbsp; / &nbsp;&nbsp;&nbsp; / २०
                    </div>
                    
                    <div class="marathi-content">
                        रोजी उपनिर्दिष्ट रुग्णालयात मी दाखल होताना असलेल्या माझ्या सर्व तक्रारींचे समाधानकारक निवारण झाल्यानंतर घरी जात आहे. हॉस्पिटलमध्ये असताना मला सर्व प्रकारची जरुर ती उपचार पद्धती आणि सेवा मिळाली. घरी जाण्यास परवानगी दिल्यानंतर मला वैद्यकीय सल्ला, डिस्चार्ज कार्ड, बिले व पावत्या रुग्णालयीन तपासण्यांचे कागद मिळाले, त्याबद्दल मी पूर्ण समाधानानी असून माझी कोणतीही तक्रार नाही.
                    </div>
                </div>
                
                <!-- Final Signatures -->
                <div style="margin-top: 25px;">
                    <div style="margin-bottom: 10px;"><strong>रुग्णाची सही</strong> ____________________</div>
                    <div><strong>नातेवाईकाची सही</strong> ____________________</div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
  `

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '8mm',
        right: '8mm',
        bottom: '8mm',
        left: '8mm'
      }
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await browser.close()
  }
}