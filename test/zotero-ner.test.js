/**
 * Zotero NER Plugin Tests
 * Mocha-compatible tests that run inside Zotero
 */

describe('Zotero NER Plugin', () => {
  
  describe('Plugin Loading', () => {
    it('should have Zotero defined', () => {
      expect(Zotero).to.exist;
      expect(Zotero).to.be.an('object');
    });

    it('should have Zotero.NameNormalizer defined', () => {
      expect(Zotero.NameNormalizer).to.exist;
      expect(Zotero.NameNormalizer).to.be.an('object');
    });

    it('should have initialized flag set to true', () => {
      expect(Zotero.NameNormalizer.initialized).to.equal(true);
    });
  });

  describe('Core Modules', () => {
    it('should have nameParser module', () => {
      expect(Zotero.NameNormalizer.nameParser).to.exist;
      expect(Zotero.NameNormalizer.nameParser.parse).to.be.a('function');
    });

    it('should have learningEngine module', () => {
      expect(Zotero.NameNormalizer.learningEngine).to.exist;
      expect(Zotero.NameNormalizer.learningEngine.storeMapping).to.be.a('function');
      expect(Zotero.NameNormalizer.learningEngine.getMapping).to.be.a('function');
    });

    it('should have variantGenerator module', () => {
      expect(Zotero.NameNormalizer.variantGenerator).to.exist;
      expect(Zotero.NameNormalizer.variantGenerator.generateVariants).to.be.a('function');
    });

    it('should have candidateFinder module', () => {
      expect(Zotero.NameNormalizer.candidateFinder).to.exist;
      expect(Zotero.NameNormalizer.candidateFinder.findPotentialVariants).to.be.a('function');
    });

    it('should have menuIntegration module', () => {
      expect(Zotero.NameNormalizer.menuIntegration).to.exist;
    });

    it('should have itemProcessor module', () => {
      expect(Zotero.NameNormalizer.itemProcessor).to.exist;
    });
  });

  describe('Name Parser', () => {
    it('should parse simple names correctly', () => {
      const result = Zotero.NameNormalizer.nameParser.parse('John Smith');
      expect(result.firstName).to.equal('John');
      expect(result.lastName).to.equal('Smith');
    });

    it('should parse names with initials', () => {
      const result = Zotero.NameNormalizer.nameParser.parse('J. Smith');
      expect(result.firstName).to.equal('J.');
      expect(result.lastName).to.equal('Smith');
    });

    it('should parse names with prefixes', () => {
      const result = Zotero.NameNormalizer.nameParser.parse('Eva van Dijk');
      expect(result.firstName).to.equal('Eva');
      expect(result.prefix).to.equal('van');
      expect(result.lastName).to.equal('Dijk');
    });
  });

  describe('Learning Engine', () => {
    it('should store and retrieve mappings', () => {
      const testKey = 'TestName_' + Date.now();
      Zotero.NameNormalizer.learningEngine.storeMapping(testKey, 'NormalizedName', 0.95);
      const mapping = Zotero.NameNormalizer.learningEngine.getMapping(testKey);
      expect(mapping).to.exist;
      expect(mapping.normalized).to.equal('NormalizedName');
      expect(mapping.confidence).to.equal(0.95);
    });
  });

  describe('Variant Generator', () => {
    it('should generate variants for a surname', () => {
      const variants = Zotero.NameNormalizer.variantGenerator.generateVariants('Smith');
      expect(variants).to.be.an('array');
      expect(variants.length).to.be.greaterThan(0);
    });
  });

  describe('Candidate Finder', () => {
    it('should find potential variants in a list of surnames', () => {
      const surnames = ['Smith', 'Smyth', 'Smythe', 'Johnson'];
      const candidates = Zotero.NameNormalizer.candidateFinder.findPotentialVariants(surnames);
      expect(candidates).to.be.an('array');
    });
  });

});
