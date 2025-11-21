/**
 * Indian Names Dictionary
 * Contains common Indian first names, surnames, and parental names
 * Used for dictionary-based name validation
 */

// Common Indian First Names (Male)
const maleFirstNames = [
  'Raj', 'Ravi', 'Kumar', 'Amit', 'Anil', 'Arjun', 'Ashok', 'Bharat', 'Deepak', 'Gaurav',
  'Harsh', 'Ishaan', 'Jay', 'Karan', 'Lokesh', 'Manish', 'Nikhil', 'Om', 'Pankaj', 'Rahul',
  'Rohit', 'Sachin', 'Tarun', 'Uday', 'Varun', 'Yash', 'Abhishek', 'Aditya', 'Akshay', 'Aman',
  'Ankit', 'Anshul', 'Arun', 'Ayush', 'Chirag', 'Dinesh', 'Gopal', 'Himanshu', 'Jatin', 'Kiran',
  'Manoj', 'Naveen', 'Piyush', 'Prateek', 'Rohit', 'Sandeep', 'Saurabh', 'Shivam', 'Siddharth', 'Vikash',
  'Vishal', 'Yogesh', 'Aarav', 'Advik', 'Aryan', 'Dhruv', 'Ishaan', 'Kabir', 'Krishna', 'Mohit',
  'Rohan', 'Shaurya', 'Vihaan', 'Vivaan', 'Ram', 'Shyam', 'Krishna', 'Krishna', 'Vishnu', 'Shiva',
  'Ganesh', 'Hanuman', 'Lakshman', 'Bharat', 'Shatrughan', 'Arjun', 'Bhima', 'Nakul', 'Sahadev', 'Yudhishthir',
  'Duryodhan', 'Karna', 'Drona', 'Bhishma', 'Abhimanyu', 'Ghatotkacha', 'Krishna', 'Balram', 'Sudama', 'Uddhav'
];

// Common Indian First Names (Female)
const femaleFirstNames = [
  'Priya', 'Anita', 'Kavita', 'Sunita', 'Rekha', 'Meera', 'Sita', 'Radha', 'Lakshmi', 'Saraswati',
  'Durga', 'Parvati', 'Ganga', 'Yamuna', 'Ganga', 'Saraswati', 'Lakshmi', 'Durga', 'Kali', 'Annapurna',
  'Aditi', 'Ananya', 'Anjali', 'Aparna', 'Arpita', 'Asha', 'Bhavna', 'Chitra', 'Deepika', 'Divya',
  'Ekta', 'Garima', 'Geeta', 'Hema', 'Isha', 'Jyoti', 'Kajal', 'Kanika', 'Kavya', 'Kriti',
  'Madhuri', 'Manisha', 'Megha', 'Neha', 'Nikita', 'Nisha', 'Pooja', 'Preeti', 'Radha', 'Rakhi',
  'Rashmi', 'Riya', 'Ruchi', 'Sakshi', 'Sanjana', 'Shreya', 'Simran', 'Sneha', 'Sonal', 'Sonia',
  'Swati', 'Tanvi', 'Tanya', 'Trisha', 'Urvashi', 'Vaishali', 'Vidya', 'Vidya', 'Yamini', 'Zara',
  'Aaradhya', 'Aanya', 'Anika', 'Avni', 'Diya', 'Ishani', 'Kiara', 'Mira', 'Navya', 'Riya',
  'Saanvi', 'Sara', 'Shanaya', 'Tara', 'Vanya', 'Zara', 'Aadhya', 'Advika', 'Anvi', 'Arya'
];

// Common Indian Surnames
const surnames = [
  'Singh', 'Kumar', 'Sharma', 'Verma', 'Gupta', 'Yadav', 'Patel', 'Khan', 'Shah', 'Agarwal',
  'Jain', 'Mehta', 'Reddy', 'Rao', 'Naidu', 'Iyer', 'Iyengar', 'Menon', 'Nair', 'Pillai',
  'Nambiar', 'Krishnan', 'Raman', 'Subramanian', 'Venkatesh', 'Srinivasan', 'Raghavan', 'Gopal', 'Krishna', 'Rama',
  'Tiwari', 'Pandey', 'Mishra', 'Dwivedi', 'Trivedi', 'Chaturvedi', 'Shukla', 'Vyas', 'Bhatt', 'Joshi',
  'Desai', 'Shah', 'Patel', 'Mehta', 'Gandhi', 'Modi', 'Shah', 'Amin', 'Sheth', 'Parikh',
  'Bhatia', 'Kapoor', 'Malhotra', 'Khanna', 'Chopra', 'Bedi', 'Sethi', 'Ahuja', 'Bajaj', 'Jindal',
  'Goel', 'Agarwal', 'Garg', 'Khandelwal', 'Bansal', 'Mittal', 'Jindal', 'Oberoi', 'Sodhi', 'Dhillon',
  'Gill', 'Sandhu', 'Brar', 'Sidhu', 'Mann', 'Cheema', 'Bhatia', 'Saini', 'Aulakh', 'Grewal',
  'Tewari', 'Sapkota', 'Karki', 'Thapa', 'Gurung', 'Tamang', 'Lama', 'Rai', 'Magar', 'Chhetri',
  'Basnet', 'Khadka', 'Bhandari', 'Pandey', 'Acharya', 'Bhattarai', 'Dahal', 'Koirala', 'Poudel', 'Adhikari'
];

// Common Parental/Guardian Name Patterns
const parentalNames = [
  'Ram', 'Shyam', 'Krishna', 'Vishnu', 'Shiva', 'Ganesh', 'Hanuman', 'Lakshman', 'Bharat', 'Shatrughan',
  'Mohan', 'Sohan', 'Rohan', 'Gopal', 'Madan', 'Chandan', 'Nandan', 'Vandan', 'Arjun', 'Bhima',
  'Nakul', 'Sahadev', 'Yudhishthir', 'Duryodhan', 'Karna', 'Drona', 'Bhishma', 'Abhimanyu', 'Ghatotkacha', 'Balram',
  'Sudama', 'Uddhav', 'Narayan', 'Vasudev', 'Devaki', 'Yashoda', 'Nanda', 'Upananda', 'Vrishni', 'Andhaka',
  'Kunti', 'Madri', 'Gandhari', 'Draupadi', 'Subhadra', 'Uttara', 'Virata', 'Drupada', 'Drona', 'Kripacharya',
  'Ashwatthama', 'Jayadratha', 'Shalya', 'Bhagadatta', 'Sudakshina', 'Kritavarma', 'Yuyutsu', 'Vikarna', 'Chitrasena', 'Dushasana'
];

// Combine all names
const allNames = [
  ...maleFirstNames,
  ...femaleFirstNames,
  ...surnames,
  ...parentalNames
];

// Create a Set for fast lookup
const nameSet = new Set(allNames.map(name => name.toLowerCase()));

// Common Indian name prefixes
const namePrefixes = ['shri', 'shrimati', 'kumari', 'sri', 'smt', 'mr', 'mrs', 'ms', 'dr', 'prof'];

// Common Indian name suffixes
const nameSuffixes = ['kumar', 'singh', 'devi', 'bai', 'lal', 'das', 'rao', 'reddy', 'naidu'];

/**
 * Check if a name token matches Indian name dictionary
 */
function isInDictionary(token) {
  const lowerToken = token.toLowerCase().trim();
  
  // Direct match
  if (nameSet.has(lowerToken)) {
    return true;
  }
  
  // Check without common prefixes
  for (const prefix of namePrefixes) {
    if (lowerToken.startsWith(prefix + ' ')) {
      const withoutPrefix = lowerToken.substring(prefix.length + 1).trim();
      if (nameSet.has(withoutPrefix)) {
        return true;
      }
    }
  }
  
  // Check without common suffixes
  for (const suffix of nameSuffixes) {
    if (lowerToken.endsWith(' ' + suffix)) {
      const withoutSuffix = lowerToken.substring(0, lowerToken.length - suffix.length - 1).trim();
      if (nameSet.has(withoutSuffix)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Fuzzy match with Indian names using Levenshtein distance
 */
function fuzzyMatch(token, threshold = 0.85) {
  const lowerToken = token.toLowerCase().trim();
  
  for (const dictName of allNames) {
    const similarity = calculateSimilarity(lowerToken, dictName.toLowerCase());
    if (similarity >= threshold) {
      return true;
    }
  }
  
  return false;
}

/**
 * Calculate Jaro-Winkler similarity between two strings
 */
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0 || len2 === 0) return 0.0;
  
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  if (matchWindow < 0) return 0.0;
  
  const str1Matches = new Array(len1).fill(false);
  const str2Matches = new Array(len2).fill(false);
  
  let matches = 0;
  let transpositions = 0;
  
  // Find matches
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    
    for (let j = start; j < end; j++) {
      if (str2Matches[j] || str1[i] !== str2[j]) continue;
      str1Matches[i] = true;
      str2Matches[j] = true;
      matches++;
      break;
    }
  }
  
  if (matches === 0) return 0.0;
  
  // Find transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!str1Matches[i]) continue;
    while (!str2Matches[k]) k++;
    if (str1[i] !== str2[k]) transpositions++;
    k++;
  }
  
  const jaro = (
    matches / len1 +
    matches / len2 +
    (matches - transpositions / 2) / matches
  ) / 3.0;
  
  // Winkler modification
  let prefix = 0;
  for (let i = 0; i < Math.min(len1, len2, 4); i++) {
    if (str1[i] === str2[i]) prefix++;
    else break;
  }
  
  return jaro + (0.1 * prefix * (1 - jaro));
}

/**
 * Get all dictionary names (for external use)
 */
function getAllNames() {
  return allNames;
}

module.exports = {
  isInDictionary,
  fuzzyMatch,
  calculateSimilarity,
  getAllNames,
  maleFirstNames,
  femaleFirstNames,
  surnames,
  parentalNames
};

