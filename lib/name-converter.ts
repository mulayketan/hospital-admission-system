/**
 * Utility functions to convert English names to Marathi
 * Based on common transliteration patterns
 */

// Common English to Marathi name mappings
const nameMapping: Record<string, string> = {
  // Common first names
  'ram': 'राम',
  'sita': 'सीता',
  'krishna': 'कृष्ण',
  'radha': 'राधा',
  'shiva': 'शिव',
  'parvati': 'पार्वती',
  'ganesh': 'गणेश',
  'lakshmi': 'लक्ष्मी',
  'vishnu': 'विष्णू',
  'brahma': 'ब्रह्मा',
  'saraswati': 'सरस्वती',
  'hanuman': 'हनुमान',
  'arjun': 'अर्जुन',
  'bhim': 'भीम',
  'yudhishthir': 'युधिष्ठिर',
  'nakul': 'नकुल',
  'sahadev': 'सहदेव',
  'draupadi': 'द्रौपदी',
  'kunti': 'कुंती',
  'gandhari': 'गांधारी',
  'karna': 'कर्ण',
  'duryodhan': 'दुर्योधन',
  'bhishma': 'भीष्म',
  'drona': 'द्रोण',
  'ashwatthama': 'अश्वत्थामा',
  'abhimanyu': 'अभिमन्यू',
  'subhadra': 'सुभद्रा',
  'rukmini': 'रुक्मिणी',
  'meera': 'मीरा',
  'tukaram': 'तुकाराम',
  'namdev': 'नामदेव',
  'eknath': 'एकनाथ',
  'dnyaneshwar': 'ज्ञानेश्वर',
  'tukdoji': 'तुकडोजी',
  'ramdas': 'रामदास',
  'shivaji': 'शिवाजी',
  'sambhaji': 'संभाजी',
  'rajaram': 'राजाराम',
  'tarabai': 'ताराबाई',
  'ahilyabai': 'अहिल्याबाई',
  'bajirao': 'बाजीराव',
  'mastani': 'मस्तानी',
  'prithviraj': 'पृथ्वीराज',
  'rani': 'राणी',
  'maharaj': 'महाराज',
  'maharani': 'महाराणी',
  
  // Common surnames
  'sharma': 'शर्मा',
  'verma': 'वर्मा',
  'gupta': 'गुप्ता',
  'agarwal': 'अग्रवाल',
  'singh': 'सिंह',
  'kumar': 'कुमार',
  'patel': 'पटेल',
  'shah': 'शाह',
  'jain': 'जैन',
  'agrawal': 'अग्रवाल',
  'bansal': 'बंसल',
  'goel': 'गोयल',
  'mittal': 'मित्तल',
  'joshi': 'जोशी',
  'kulkarni': 'कुलकर्णी',
  'deshpande': 'देशपांडे',
  'patil': 'पाटील',
  'jadhav': 'जाधव',
  'pawar': 'पवार',
  'more': 'मोरे',
  'shinde': 'शिंदे',
  'gaikwad': 'गायकवाड',
  'bhosale': 'भोसले',
  'salunkhe': 'सालुंखे',
  'kadam': 'कदम',
  'mane': 'माने',
  'sawant': 'सावंत',
  'raut': 'राऊत',
  'kale': 'काळे',
  'mali': 'माळी',
  'kamble': 'कांबळे',
  'thorat': 'थोरात',
  'chavan': 'चव्हाण',
  'yadav': 'यादव',
  'mahajan': 'महाजन',
  'desai': 'देसाई',
  'mehta': 'मेहता',
  'trivedi': 'त्रिवेदी',
  'pandey': 'पांडे',
  'mishra': 'मिश्रा',
  'tiwari': 'तिवारी',
  'dubey': 'दुबे',
  'chaturvedi': 'चतुर्वेदी',
  'shukla': 'शुक्ला',
  'srivastava': 'श्रीवास्तव',
  'rajput': 'राजपूत',
  'thakur': 'ठाकूर',
  'chouhan': 'चौहान',
  'rathore': 'राठोड',
  'solanki': 'सोलंकी',
  'parmar': 'परमार',
  'prajapati': 'प्रजापती'
}

// Character mapping for transliteration
const charMapping: Record<string, string> = {
  'a': 'अ', 'aa': 'आ', 'i': 'इ', 'ii': 'ई', 'u': 'उ', 'uu': 'ऊ',
  'e': 'ए', 'ai': 'ऐ', 'o': 'ओ', 'au': 'औ',
  'ka': 'क', 'kha': 'ख', 'ga': 'ग', 'gha': 'घ', 'nga': 'ङ',
  'cha': 'च', 'chha': 'छ', 'ja': 'ज', 'jha': 'झ', 'nya': 'ञ',
  'ta': 'ट', 'tha': 'ठ', 'da': 'ड', 'dha': 'ढ', 'na': 'ण',
  'taa': 'त', 'thaa': 'थ', 'daa': 'द', 'dhaa': 'ध', 'naa': 'न',
  'pa': 'प', 'pha': 'फ', 'ba': 'ब', 'bha': 'भ', 'ma': 'म',
  'ya': 'य', 'ra': 'र', 'la': 'ल', 'va': 'व',
  'sha': 'श', 'shha': 'ष', 'sa': 'स', 'ha': 'ह',
  'ksha': 'क्ष', 'tra': 'त्र', 'gya': 'ज्ञ'
}

/**
 * Convert English name to Marathi
 */
export function convertToMarathi(englishName: string): string {
  if (!englishName || englishName.trim() === '') {
    return ''
  }

  const name = englishName.toLowerCase().trim()
  
  // Check if exact mapping exists
  if (nameMapping[name]) {
    return nameMapping[name]
  }

  // Try partial matches for compound names
  for (const [english, marathi] of Object.entries(nameMapping)) {
    if (name.includes(english) || english.includes(name)) {
      return marathi
    }
  }

  // Basic transliteration for unknown names
  return basicTransliterate(englishName)
}

/**
 * Basic transliteration for names not in the mapping
 */
function basicTransliterate(name: string): string {
  let result = ''
  const cleanName = name.toLowerCase().replace(/[^a-z]/g, '')
  
  // Simple character-by-character conversion
  for (let i = 0; i < cleanName.length; i++) {
    const char = cleanName[i]
    
    // Basic consonant + vowel combinations
    if (i < cleanName.length - 1) {
      const twoChar = cleanName.substring(i, i + 2)
      if (charMapping[twoChar]) {
        result += charMapping[twoChar]
        i++ // Skip next character
        continue
      }
    }
    
    // Single character mapping
    switch (char) {
      case 'a': result += 'अ'; break
      case 'b': result += 'ब'; break
      case 'c': result += 'च'; break
      case 'd': result += 'द'; break
      case 'e': result += 'ए'; break
      case 'f': result += 'फ'; break
      case 'g': result += 'ग'; break
      case 'h': result += 'ह'; break
      case 'i': result += 'इ'; break
      case 'j': result += 'ज'; break
      case 'k': result += 'क'; break
      case 'l': result += 'ल'; break
      case 'm': result += 'म'; break
      case 'n': result += 'न'; break
      case 'o': result += 'ओ'; break
      case 'p': result += 'प'; break
      case 'q': result += 'क'; break
      case 'r': result += 'र'; break
      case 's': result += 'स'; break
      case 't': result += 'त'; break
      case 'u': result += 'उ'; break
      case 'v': result += 'व'; break
      case 'w': result += 'व'; break
      case 'x': result += 'क्स'; break
      case 'y': result += 'य'; break
      case 'z': result += 'झ'; break
      default: result += char; break
    }
  }
  
  return result || name // Return original if conversion fails
}

/**
 * Convert full name (first middle last) to Marathi
 */
export function convertFullNameToMarathi(firstName: string, middleName?: string, lastName?: string): {
  firstNameMarathi: string
  middleNameMarathi: string
  surnameMarathi: string
} {
  return {
    firstNameMarathi: convertToMarathi(firstName),
    middleNameMarathi: middleName ? convertToMarathi(middleName) : '',
    surnameMarathi: convertToMarathi(lastName || '')
  }
}
