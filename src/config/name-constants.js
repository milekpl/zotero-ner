/**
 * Name-related constants for author normalization
 * @module config/name-constants
 */

/**
 * Prefixes commonly found in surnames (e.g., "van" in "van Gogh")
 * @type {string[]}
 */
const NAME_PREFIXES = [
  'van', 'de', 'la', 'von', 'del', 'di', 'du', 'le', 'lo', 'da',
  'des', 'dos', 'das', 'el', 'al', 'do', "d", "O'", 'Mac',
  'Mc', 'Saint', 'St', 'San', 'Santa'
];

/**
 * Suffixes commonly found in names (academic, generational, etc.)
 * @type {string[]}
 */
const NAME_SUFFIXES = [
  'Jr', 'Sr', 'II', 'III', 'IV', 'V', 'PhD', 'MD', 'JD', 'MBA',
  'MA', 'BA', 'BS', 'MS', 'BSc', 'MSc', 'Dr', 'Prof', 'Sir',
  'Jr.', 'Sr.'
];

/**
 * Common given name equivalents (American/English variations)
 * @type {Object}
 */
const COMMON_GIVEN_NAME_EQUIVALENTS = {
  'William': ['Bill', 'Will', 'Willy', 'Billy'],
  'Robert': ['Bob', 'Rob', 'Bobby', 'Bert'],
  'James': ['Jim', 'Jimmy', 'Jamie', 'Jake'],
  'John': ['Jack', 'Johnny', 'Jon', 'Sean'],
  'Michael': ['Mike', 'Mick', 'Mickey', 'Mikey'],
  'David': ['Dave', 'Davey', 'Davy'],
  'Richard': ['Rich', 'Dick', 'Ricky', 'Rick'],
  'Charles': ['Chuck', 'Charlie', 'Charley', 'Carl'],
  'Thomas': ['Tom', 'Tommy', 'Todd'],
  'Christopher': ['Chris', 'Christoph', 'Kit'],
  'Daniel': ['Dan', 'Danny', 'Dani'],
  'Matthew': ['Matt', 'Matthieu', 'Matthew'],
  'Anthony': ['Tony', 'Ant'],
  'Mark': ['Marc', 'Marco'],
  'Steven': ['Steve', 'Stevie'],
  'Paul': ['Paolo'],
  'Andrew': ['Andy', 'Drew', 'Andreas'],
  'Joshua': ['Josh', 'Josiah'],
  'Kenneth': ['Ken', 'Kenny'],
  'Kevin': ['Kev'],
  'Brian': ['Bry', 'Bri'],
  'George': ['Geo', 'Georgie'],
  'Edward': ['Ed', 'Eddie', 'Ned', 'Ted'],
  'Ronald': ['Ron', 'Ronny'],
  'Timothy': ['Tim', 'Timmy', 'Timothy'],
  'Jason': ['Jay', 'Jace'],
  'Jeffrey': ['Jeff', 'Geoff', 'Jeffrey'],
  'Ryan': ['Ry'],
  'Jacob': ['Jake', 'Jay'],
  'Gary': ['Gare', 'Gar'],
  'Jonathan': ['Jon', 'John', 'Jonny'],
  'Stephen': ['Steve', 'Steph', 'Steven'],
  'Larry': ['Lawr', 'Larr'],
  'Justin': ['Just', 'Jus'],
  'Scott': ['Scot'],
  'Brandon': ['Brand', 'Bran'],
  'Benjamin': ['Ben', 'Benny', 'Benjy'],
  'Samuel': ['Sam', 'Sammy', 'Samuel'],
  'Raymond': ['Ray', 'Raye'],
  'Frank': ['Fran', 'Franky'],
  'Gregory': ['Greg', 'Gregg', 'Gregory'],
  'Alexander': ['Alex', 'Xander', 'Andy'],
  'Patrick': ['Pat', 'Paddy', 'Rick'],
  'Jack': ['John', 'Johnny'],
  'Dennis': ['Denn', 'Den'],
  'Jerry': ['Jer', 'Jerr'],
  'Tyler': ['Ty'],
  'Aaron': ['Ron', 'Aron'],
  'Jose': ['Joe', 'Joey', 'Jose'],
  'Adam': ['Addy'],
  'Nathan': ['Nate', 'Nat'],
  'Henry': ['Hank', 'Harry'],
  'Douglas': ['Doug', 'Dough'],
  'Zachary': ['Zach', ' Zak'],
  'Peter': ['Pete', 'Peter'],
  'Kyle': ['Ky'],
  'Noah': ['Noa'],
  'Ethan': ['Eth'],
  'Jeremy': ['Jer', 'Remy'],
  'Walter': ['Walt', 'Wally'],
  'Christian': ['Chris', 'Christ'],
  'Keith': ['Kei'],
  'Roger': ['Roge', 'Rog'],
  'Terry': ['Ter', 'Terr'],
  'Austin': ['Aus'],
  'Sean': ['Shawn', 'John', 'Sean'],
  'Gerald': ['Gerry', 'Geral', 'Jerry'],
  'Carl': ['Karl', 'Chuck'],
  'Dylan': ['Dill'],
  'Arthur': ['Art', 'Artie'],
  'Lawrence': ['Larry', 'Laur'],
  'Jordan': ['Jord', 'Jay'],
  'Jesse': ['Jess', 'Jesse'],
  'Bryan': ['Bryant', 'Bry'],
  'Billy': ['Bill', 'William'],
  'Bruce': ['Bru'],
  'Gabriel': ['Gabe', 'Gabby'],
  'Joe': ['Joseph', 'Joey'],
  'Logan': ['Log'],
  'Albert': ['Al', 'Bert'],
  'Willie': ['Bill', 'William', 'Will'],
  'Alan': ['Al', 'Allen'],
  'Norman': ['Norm'],
  'Harold': ['Hal', 'Harry'],
  'Martha': ['Marty'],
  'Gloria': ['Glo'],
  'Annie': ['Ann'],
  'Olivia': ['Livy']
};

/**
 * European name equivalents
 * @type {Object}
 */
const EUROPEAN_NAME_EQUIVALENTS = {
  'Johann': ['Johannes', 'Hans', 'Jan'],
  'Johannes': ['Johann', 'Hans', 'Jan'],
  'Hans': ['Johann', 'Johannes', 'Jan', 'Gian'],
  'Jan': ['Johannes', 'Hans', 'Johan'],
  'Johan': ['Johannes', 'Jan', 'John'],
  'Jean': ['John', 'Jean', 'Johannes'],
  'Pierre': ['Peter', 'Pier'],
  'Gian': ['John', 'Gianni', 'Jean'],
  'Gianni': ['John', 'Gian', 'Jean'],
  'Ivan': ['John', 'Ian'],
  'Ian': ['John', 'Ivan'],
  'Willem': ['William', 'Willy', 'Bill'],
  'Guillaume': ['William', 'Bill'],
  'Guillermo': ['William', 'Bill'],
  'Guglielmo': ['William', 'Bill'],
  'Wilhelm': ['William', 'Bill'],
  'Franz': ['Francis', 'Frank'],
  'Francis': ['Franz', 'Frank', 'Francesco'],
  'Francesco': ['Francis', 'Frank'],
  'Andres': ['Andrew', 'Andreas'],
  'Andreas': ['Andrew', 'Andres'],
  'Andrea': ['Andrew', 'Andreas'],
  'Andre': ['Andrew', 'Andreas'],
  'Andrei': ['Andrew', 'Andreas'],
  'Kurt': ['Conrad', 'Kurt'],
  'Conrad': ['Kurt', 'Con'],
  'Lukas': ['Lucas', 'Luke'],
  'Lucas': ['Luke', 'Lukas'],
  'Luca': ['Luke', 'Lucas'],
  'Klaus': ['Nicolas', 'Claus'],
  'Nicolas': ['Nick', 'Nicolas', 'Klaus'],
  'Nikolaus': ['Nick', 'Nicolas', 'Klaus'],
  'Boris': ['Bill', 'Boris'],
  'Aleksander': ['Alex', 'Sasha'],
  'Aleksandr': ['Alex', 'Sasha'],
  'Sasha': ['Alexander', 'Alex'],
  'Michele': ['Michael', 'Michel', 'Mick'],
  'Michel': ['Michael', 'Michele', 'Mick'],
  'Mikhail': ['Michael', 'Mick']
};

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    NAME_PREFIXES,
    NAME_SUFFIXES,
    COMMON_GIVEN_NAME_EQUIVALENTS,
    EUROPEAN_NAME_EQUIVALENTS
  };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.NameConstants = {
    NAME_PREFIXES,
    NAME_SUFFIXES,
    COMMON_GIVEN_NAME_EQUIVALENTS,
    EUROPEAN_NAME_EQUIVALENTS
  };
}
