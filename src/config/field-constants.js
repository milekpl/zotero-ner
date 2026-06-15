/**
 * Field-related constants for field normalization
 * @module config/field-constants
 */

/**
 * Publisher name abbreviations to expand
 * @type {string[]}
 */
const PUBLISHER_ABBREVIATIONS = [
  'Co.',
  'Co',
  'Inc.',
  'Inc',
  'Ltd.',
  'Ltd',
  'Pub.',
  'Pub',
  'Corp.',
  'Corp',
  'Press',
  'Press.',
  'UP',
  'University Press'
];

/**
 * US state abbreviations mapping (abbreviation -> full name)
 * @type {Object}
 */
const STATE_ABBREVIATIONS = {
  'AL': 'Alabama',
  'AK': 'Alaska',
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'District of Columbia'
};

/**
 * Canadian province abbreviations mapping (abbreviation -> full name)
 * @type {Object}
 */
const PROVINCE_ABBREVIATIONS = {
  'AB': 'Alberta',
  'BC': 'British Columbia',
  'MB': 'Manitoba',
  'NB': 'New Brunswick',
  'NL': 'Newfoundland',
  'NS': 'Nova Scotia',
  'NT': 'Northwest Territories',
  'NU': 'Nunavut',
  'ON': 'Ontario',
  'PE': 'Prince Edward Island',
  'QC': 'Quebec',
  'SK': 'Saskatchewan',
  'YT': 'Yukon'
};

/**
 * Publisher name patterns for normalization
 * Maps full publisher names to standardized forms
 * @type {Object}
 */
const PUBLISHER_PATTERNS = {
  'Springer-Verlag': 'Springer',
  'Springer Science+Business Media': 'Springer',
  'John Wiley & Sons': 'Wiley',
  'Wiley-Blackwell': 'Wiley',
  'John Wiley': 'Wiley',
  'Wiley & Sons': 'Wiley',
  'Elsevier BV': 'Elsevier',
  'Elsevier B.V.': 'Elsevier',
  'Elsevier Science': 'Elsevier',
  'Taylor & Francis': 'Taylor and Francis',
  'Taylor & Francis Group': 'Taylor and Francis',
  'Routledge': 'Taylor and Francis',
  'Oxford University Press': 'Oxford UP',
  'Cambridge University Press': 'Cambridge UP',
  'MIT Press': 'MIT Press',
  'Harvard University Press': 'Harvard UP',
  'University of Chicago Press': 'Chicago UP',
  'Princeton University Press': 'Princeton UP',
  'Stanford University Press': 'Stanford UP',
  'Yale University Press': 'Yale UP',
  'Nature Publishing Group': 'Nature',
  'Nature Publishing': 'Nature',
  'Science': 'AAAS',
  'American Association for the Advancement of Science': 'AAAS',
  'American Chemical Society': 'ACS',
  'American Institute of Physics': 'AIP',
  'Institute of Electrical and Electronics Engineers': 'IEEE'
};

/**
 * Publisher separator patterns for splitting multi-publisher values
 * @type {RegExp[]}
 */
const PUBLISHER_SEPARATORS = [
  /\s*;\s*/,
  /\s*\/\s*/,
  /\s*&\s*/,
  /\s+and\s+/i,
  /\s*-\s*/
];

/**
 * Location separators for splitting multi-location values
 * @type {RegExp[]}
 */
const LOCATION_SEPARATORS = [
  /\s*;\s*/,
  /\s*\/\s*/,
  /,\s*/
];

/**
 * Common location separators for splitting
 * @type {string[]}
 */
const LOCATION_SEPARATOR_STRINGS = [
  ';',
  '/',
  ','
];

/**
 * Field types supported by the normalizer
 * @type {string[]}
 */
const SUPPORTED_FIELD_TYPES = [
  'publisher',
  'location',
  'journal',
  'place'
];

/**
 * Default normalization options
 * @type {Object}
 */
const DEFAULT_FIELD_OPTIONS = {
  expandAbbreviations: true,
  normalizeSeparators: true,
  splitMultiValues: true,
  caseNormalization: 'titlecase',
  removeTrailingPunctuation: true
};

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    PUBLISHER_ABBREVIATIONS,
    STATE_ABBREVIATIONS,
    PROVINCE_ABBREVIATIONS,
    PUBLISHER_PATTERNS,
    PUBLISHER_SEPARATORS,
    LOCATION_SEPARATORS,
    LOCATION_SEPARATOR_STRINGS,
    SUPPORTED_FIELD_TYPES,
    DEFAULT_FIELD_OPTIONS
  };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.FieldConstants = {
    PUBLISHER_ABBREVIATIONS,
    STATE_ABBREVIATIONS,
    PROVINCE_ABBREVIATIONS,
    PUBLISHER_PATTERNS,
    PUBLISHER_SEPARATORS,
    LOCATION_SEPARATORS,
    LOCATION_SEPARATOR_STRINGS,
    SUPPORTED_FIELD_TYPES,
    DEFAULT_FIELD_OPTIONS
  };
}
