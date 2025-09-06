import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PatientModel, WardChargesModel } from '@/lib/sheets-models'
import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { formatDate } from '@/lib/utils'

// Use Node.js runtime for Google Sheets API compatibility
export const runtime = 'nodejs'

function generateAdmissionHTML(patient: any, wardCharges: any) {
  return `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; font-size: 13px; }
          h1 { color: #333; text-align: center; margin-bottom: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { width: 60px; height: 60px; margin: 0 auto 10px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          td, th { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .section { margin: 20px 0; }
          .signature-lines { margin-top: 40px; }
          .signature-box { display: inline-block; width: 45%; margin-right: 10%; }
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🏥</div>
          <h1>ZAWAR HOSPITAL</h1>
          <h2>REGISTRATION CUM ADMISSION</h2>
        </div>

        <div class="section">
          <h3>Patient Information</h3>
          <table>
            <tr><th>IPD No</th><td>${patient.ipdNo || 'N/A'}</td><th>Date of Admission</th><td>${formatDate(new Date(patient.dateOfAdmission))}</td></tr>
            <tr><th>Name (English)</th><td colspan="3">${patient.firstName} ${patient.middleName || ''} ${patient.surname}</td></tr>
            <tr><th>Name (Marathi)</th><td colspan="3">${patient.firstNameMarathi} ${patient.middleNameMarathi || ''} ${patient.surnameMarathi}</td></tr>
            <tr><th>Age</th><td>${patient.age}</td><th>Gender</th><td>${patient.gender}</td></tr>
            <tr><th>Address</th><td colspan="3">${patient.address}</td></tr>
            <tr><th>Phone</th><td>${patient.phoneNo}</td><th>Ward</th><td>${patient.ward.replace(/_/g, ' ')}</td></tr>
          </table>
        </div>

        <div class="section">
          <h3>Declaration</h3>
          <p><strong>English:</strong> I agree to abide by all the terms and conditions of the hospital currently in existence. I will be responsible for taking the patient from the hospital. I have been given full details of the charges for the class in which the patient is to be admitted and I am ready to pay all the amount and then the patient will be admitted. I am admitting the patient to this hospital on my responsibility. I have confidence in the doctor treating the patient and I consent to receive treatment from him.</p>
          
          <p><strong>Marathi:</strong> रुग्णालयातील वास्तव्यामध्ये सध्या अस्तित्वात असणाऱ्या रुग्णालयांच्या सर्व अटी व नियमांचे पालन मी करेन. रुग्णाला रुग्णालयातून घेऊन जाण्याची जबाबदारी माझी राहील. रुग्णाला ज्या प्रवर्गात दाखल करावयाचे आहे त्या प्रवर्गाला मोबदल्याची मला पूर्ण कल्पना दिली असून सर्व रक्कम मी भरण्यास तयार आहे व त्यानंतर रुग्णाला दाखल करून घेतले जाईल. मी रुग्णास माझ्या जबाबदारीवर या रुग्णालयात दाखल करीत आहे. रुग्णावर उपचार करणाऱ्या डॉक्टरवर माझा विश्वास आहे व त्याचेकडून उपचार करून घेण्यास माझी संमती आहे.</p>
        </div>

        <div class="signature-lines">
          <div class="signature-box">
            <p>Patient/Relative Signature:</p>
            <br><br>
            <p>Name: ${patient.nameOfNearestRelative || ''}</p>
            <p>Date: ${formatDate(new Date())}</p>
          </div>
          <div class="signature-box">
            <p>Hospital Staff Signature:</p>
            <br><br>
            <p>Name: ________________</p>
            <p>Date: ${formatDate(new Date())}</p>
          </div>
        </div>

        <div class="page-break"></div>

        <div class="section">
          <h3>Payee Slip</h3>
          <table>
            <tr><th>Charges</th><th>नातेवाईकांचे नाव</th><th>Per Day Amount</th><th>Total</th></tr>
            <tr><td>Bed Charges</td><td>${patient.nameOfNearestRelative || ''}</td><td>₹${wardCharges?.bedCharges || 0}</td><td>₹${wardCharges?.bedCharges || 0}</td></tr>
            <tr><td>Doctor Charges</td><td></td><td>₹${wardCharges?.doctorCharges || 0}</td><td>₹${wardCharges?.doctorCharges || 0}</td></tr>
            <tr><td>Nursing Charges</td><td></td><td>₹${wardCharges?.nursingCharges || 0}</td><td>₹${wardCharges?.nursingCharges || 0}</td></tr>
            <tr><td><strong>Total Per Day</strong></td><td></td><td></td><td><strong>₹${wardCharges?.totalPerDay || 0}</strong></td></tr>
          </table>
        </div>

        <div class="section">
          <h3>परिशिष्ट "ब"</h3>
          <p>मी / आम्ही रुग्णावर दि. ____/____/२०__ पासून दि. ____/____/२०__ पर्यंत औषधोपचार करीत आहे / आहोत. आज रोजी घरी जाण्यास परवानगी देत आहोत.</p>
          
          <p>Final Diagnosis: ___________________________</p>
          
          <div style="margin-top: 30px;">
            <div style="float: left; width: 50%;">
              <p>तज्ज्ञ वैद्यकीय अधिकारी</p>
              <p>डॉ. ____________________</p>
              <p>स्वाक्षरी ____________________</p>
              <p>दि. ____/____/२०__ वेळ : __________</p>
            </div>
            <div style="float: right; width: 50%;">
              <p>मी खाली सही करणारे _____________________________</p>
              <p>दि. ____/____/२०__ रोजी उपनिर्दिष्ट रुग्णालयात मी दाखल होताना असलेल्या माझ्या सर्व तक्रारींचे समाधानकारक निवारण झाल्यानंतर घरी जात आहे.</p>
              <br>
              <p>रुग्णाची सही ____________________ नातेवाईकाची सही ____________________</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const patient = await PatientModel.findById(id)

    if (!patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    // Fetch ward charges from Google Sheets
    const wardCharges = await WardChargesModel.findByWardType(patient.ward)

    // Launch puppeteer with sparticuz chromium (ChatGPT recommended approach)
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar"
      ),
      headless: true,
    })

    const page = await browser.newPage()

    // Generate the HTML content (using our existing logic but simplified)
    const html = generateAdmissionHTML(patient, wardCharges)

    await page.setContent(html, { waitUntil: 'networkidle0' })

    const pdfBuffer = await page.pdf({ format: 'A4' })

    await browser.close()

    const fileName = `admission-form-${patient.ipdNo || id}.pdf`

    return new NextResponse(pdfBuffer as BufferSource, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error: any) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
