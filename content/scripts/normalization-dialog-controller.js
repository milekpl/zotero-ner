/**
 * NER Normalization Dialog Controller
 * Provides interactive UI for reviewing and applying author name normalizations.
 */

/* global Zotero, ZoteroNER */

var ZoteroNER_NormalizationDialog = {
  dbAnalyzer: null,
  isProcessing: false,
  selectedVariantGroupIndex: 0,
  htmlUtils: null,
  analysisResults: null,

  init: function() {
    console.log('Dialog initialization started');
    Promise.resolve(this.initialize()).catch((error) => {
      console.error(error);
      this.alert('Error', 'Failed to initialize normalization dialog: ' + error.message);
      window.close();
    });
  },

  log: function(message) {
    try {
      if (typeof Zotero !== 'undefined' && typeof Zotero.debug === 'function') {
        Zotero.debug('Zotero NER Dialog: ' + message);
      }
      console.log('Zotero NER Dialog: ' + message);
    } catch (e) {
      console.log('Zotero NER Dialog: ' + message);
    }
  },

  alert: function(title, message) {
    try {
      if (typeof Zotero !== 'undefined' && typeof Zotero.alert === 'function') {
        Zotero.alert(null, title, message);
      } else if (typeof window !== 'undefined' && window.alert) {
        window.alert(title + ': ' + message);
      }
    } catch (e) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(title + ': ' + message);
      }
    }
  },

  initialize: async function() {
    this.log('Dialog initialize started');

    // Use HTML utils if available
    if (typeof ZoteroNER_HTMLUtils !== 'undefined') {
      this.htmlUtils = ZoteroNER_HTMLUtils;
      this.log('HTML utils detected');
    }

    // Get analysis results - prefer global for HTML, fallback to arguments for XUL
    var params = window.ZoteroNERDialogParams || window.arguments || [];
    if (params && params.length > 0 && params[0] && params[0].analysisResults) {
      this.analysisResults = params[0].analysisResults;
      this.log('Pre-computed analysis results loaded: ' + (this.analysisResults.suggestions ? this.analysisResults.suggestions.length : 0) + ' suggestions');
    } else {
      this.log('No analysis results found');
      this.showEmptyState();
      return;
    }

    this.updateSummaryHeader();
    this.populateVariantGroupList();
    this.renderCurrentVariantGroup();
    this.updateProgress();
  },

  showEmptyState: function() {
    if (this.htmlUtils) {
      this.htmlUtils.setHidden('summary-group', true);
      this.htmlUtils.clearContainer('variant-group-list');
      const emptyLi = this.htmlUtils.createElement('li', { class: 'zotero-ner-empty-message' });
      emptyLi.innerHTML = '<div class="empty-message">No analysis results available.</div>';
      this.htmlUtils.appendTo('variant-group-list', emptyLi);
      this.setApplyEnabled(false);
    }
  },

  updateSummaryHeader: function() {
    if (!this.analysisResults) return;

    if (this.htmlUtils) {
      this.htmlUtils.setHidden('summary-group', false);
      this.htmlUtils.setText('summary-total-creators', this.analysisResults.totalUniqueSurnames || '0');
      this.htmlUtils.setText('summary-variant-groups', this.analysisResults.totalVariantGroups || '0');
      this.htmlUtils.setText('summary-pending-normalizations', this.analysisResults.suggestions ? this.analysisResults.suggestions.length : '0');
    }
  },

  populateVariantGroupList: function() {
    if (!this.analysisResults || !this.analysisResults.suggestions || this.analysisResults.suggestions.length === 0) {
      this.showEmptyState();
      return;
    }

    const list = this.htmlUtils ? this.htmlUtils.getElement('variant-group-list') : document.getElementById('variant-group-list');
    if (!list) return;

    if (this.htmlUtils) {
      this.htmlUtils.clearContainer('variant-group-list');
    } else {
      while (list.firstChild) list.removeChild(list.firstChild);
    }

    this.analysisResults.suggestions.forEach((suggestion, i) => {
      const listItem = this.htmlUtils ? this.htmlUtils.createElement('li', { class: 'zotero-ner-variant-group', 'data-index': i }) : this.createNode('richlistitem');
      if (!this.htmlUtils) {
        listItem.setAttribute('value', i);
        listItem.setAttribute('class', 'zotero-ner-variant-group');
      }

      const container = this.htmlUtils ? this.htmlUtils.createElement('div', { class: 'zotero-ner-variant-group-body' }) : this.createNode('vbox');
      if (!this.htmlUtils) {
        container.setAttribute('class', 'zotero-ner-variant-group-body');
      }

      const title = this.htmlUtils ? this.htmlUtils.createElement('h4', { class: 'zotero-ner-variant-group-title' }) : this.createNode('label');
      const titleText = `Variant group ${i + 1}`;
      if (this.htmlUtils) {
        title.textContent = titleText;
      } else {
        title.setAttribute('value', titleText);
        title.setAttribute('class', 'zotero-ner-variant-group-title');
      }

      const primary = this.htmlUtils ? this.htmlUtils.createElement('div', { class: 'zotero-ner-variant-group-primary primary' }) : this.createNode('label');
      const primaryText = 'Primary: ' + this.formatNameString(suggestion.primary);
      if (this.htmlUtils) {
        primary.innerHTML = '<strong>Primary:</strong> ' + this.formatNameString(suggestion.primary);
      } else {
        primary.setAttribute('value', primaryText);
        primary.setAttribute('class', 'zotero-ner-variant-group-primary');
      }

      const variantsDiv = this.htmlUtils ? this.htmlUtils.createElement('div', { class: 'zotero-ner-variant-group-variants' }) : this.createNode('label');
      const variantNames = suggestion.variants.map(v => `${this.formatNameString(v.name)} (${v.frequency})`).join(', ');
      const variantsText = 'Variants: ' + variantNames;
      if (this.htmlUtils) {
        variantsDiv.innerHTML = '<strong>Variants:</strong> ' + variantNames;
      } else {
        variantsDiv.setAttribute('value', variantsText);
        variantsDiv.setAttribute('class', 'zotero-ner-variant-group-variants');
      }

      if (this.htmlUtils) {
        container.appendChild(title);
        container.appendChild(primary);
        container.appendChild(variantsDiv);
        listItem.appendChild(container);
      } else {
        var vbox = container;
        vbox.appendChild(title);
        vbox.appendChild(primary);
        vbox.appendChild(variantsDiv);
        listItem.appendChild(vbox);
      }

      if (list) list.appendChild(listItem);
    });

    this.highlightVariantGroup();
  },

  renderCurrentVariantGroup: function() {
    if (!this.analysisResults || !this.analysisResults.suggestions || this.analysisResults.suggestions.length === 0) {
      this.setApplyEnabled(false);
      return;
    }

    const index = this.selectedVariantGroupIndex || 0;
    const suggestion = this.analysisResults.suggestions[index];

    const container = this.htmlUtils ? this.htmlUtils.getElement('suggestions-container') : document.getElementById('suggestions-container');
    if (!container) return;

    this.clearSuggestions();

    if (this.htmlUtils) {
      this.htmlUtils.setHidden('suggestions-group', false);
    } else {
      const group = document.getElementById('suggestions-group');
      if (group) group.hidden = false;
    }

    const groupDiv = this.htmlUtils ? this.htmlUtils.createElement('div', { class: 'variant-group ner-creator-group' }) : this.createNode('groupbox');
    if (!this.htmlUtils) {
      groupDiv.setAttribute('class', 'ner-creator-group');
    }

    const caption = this.htmlUtils ? this.htmlUtils.createElement('h4') : this.createNode('caption');
    const captionText = 'Variant Group ' + (index + 1);
    if (this.htmlUtils) {
      caption.textContent = captionText;
    } else {
      caption.setAttribute('label', captionText);
    }
    groupDiv.appendChild(caption);

    const body = this.htmlUtils ? this.htmlUtils.createElement('div', { class: 'ner-creator-body' }) : this.createNode('vbox');
    if (!this.htmlUtils) {
      body.setAttribute('class', 'ner-creator-body');
    }

    // Primary
    const primaryLabel = this.htmlUtils ? this.htmlUtils.createElement('div', { class: 'primary ner-creator-original' }) : this.createNode('label');
    const primaryText = 'Recommended normalization: ' + this.formatNameString(suggestion.primary);
    if (this.htmlUtils) {
      primaryLabel.innerHTML = 'Recommended normalization: <strong>' + this.formatNameString(suggestion.primary) + '</strong>';
    } else {
      primaryLabel.setAttribute('value', primaryText);
      primaryLabel.setAttribute('class', 'ner-creator-original');
    }
    body.appendChild(primaryLabel);

    // Choice options (simple radio for HTML)
    const choiceGroup = this.htmlUtils ? this.htmlUtils.createElement('div', { class: 'radio-group', id: 'ner-variant-group-choice-' + index }) : this.createNode('radiogroup');
    if (!this.htmlUtils) {
      choiceGroup.setAttribute('id', 'ner-variant-group-choice-' + index);
      choiceGroup.setAttribute('orient', 'vertical');
    }

    // Primary radio
    if (this.htmlUtils) {
      const primaryRadioDiv = this.htmlUtils.createElement('div');
      const primaryRadio = this.htmlUtils.createElement('input', { type: 'radio', value: 'primary', name: 'choice-' + index, checked: 'checked' });
      const primaryLabelEl = this.htmlUtils.createElement('label');
      primaryLabelEl.textContent = 'Use recommended normalization: ' + this.formatNameString(suggestion.primary);
      primaryRadioDiv.appendChild(primaryRadio);
      primaryRadioDiv.appendChild(primaryLabelEl);
      choiceGroup.appendChild(primaryRadioDiv);
    } else {
      const primaryRadio = this.createNode('radio');
      primaryRadio.setAttribute('value', 'primary');
      primaryRadio.setAttribute('label', 'Use recommended normalization: ' + this.formatNameString(suggestion.primary));
      primaryRadio.setAttribute('selected', 'true');
      choiceGroup.appendChild(primaryRadio);
    }

    // Keep original
    if (this.htmlUtils) {
      const keepDiv = this.htmlUtils.createElement('div');
      const keepRadio = this.htmlUtils.createElement('input', { type: 'radio', value: 'original', name: 'choice-' + index });
      const keepLabel = this.htmlUtils.createElement('label');
      keepLabel.textContent = 'Keep existing forms as-is';
      keepDiv.appendChild(keepRadio);
      keepDiv.appendChild(keepLabel);
      choiceGroup.appendChild(keepDiv);
    } else {
      const keepRadio = this.createNode('radio');
      keepRadio.setAttribute('value', 'original');
      keepRadio.setAttribute('label', 'Keep existing forms as-is');
      choiceGroup.appendChild(keepRadio);
    }

    // Variants
    if (suggestion.variants && suggestion.variants.length > 0) {
      if (this.htmlUtils) {
        const variantsLabel = this.htmlUtils.createElement('label', { class: 'ner-creator-meta' });
        variantsLabel.textContent = 'Variants in this group:';
        body.appendChild(variantsLabel);

        suggestion.variants.forEach((v, j) => {
          const vDiv = this.htmlUtils.createElement('div');
          const vRadio = this.htmlUtils.createElement('input', { type: 'radio', value: 'variant-' + j, name: 'choice-' + index });
          const vLabel = this.htmlUtils.createElement('label');
          vLabel.textContent = this.formatNameString(v.name) + ' • ' + v.frequency + ' occurrences';
          vDiv.appendChild(vRadio);
          vDiv.appendChild(vLabel);
          choiceGroup.appendChild(vDiv);
        });
      } else {
        const variantsLabel = this.createNode('label');
        variantsLabel.setAttribute('value', 'Variants in this group:');
        variantsLabel.setAttribute('class', 'ner-creator-meta');
        body.appendChild(variantsLabel);

        for (var j = 0; j < suggestion.variants.length; j++) {
          var v = suggestion.variants[j];
          var vRadio = this.createNode('radio');
          vRadio.setAttribute('value', 'variant-' + j);
          vRadio.setAttribute('label', this.formatNameString(v.name) + ' • ' + v.frequency + ' occurrences');
          choiceGroup.appendChild(vRadio);
        }
      }
    }

    body.appendChild(choiceGroup);

    // Confidence
    if (typeof suggestion.similarity === 'number') {
      const confLabel = this.htmlUtils ? this.htmlUtils.createElement('div', { class: 'ner-creator-meta confidence' }) : this.createNode('label');
      const confText = 'Group confidence: ' + Math.round(suggestion.similarity * 100) + '%';
      if (this.htmlUtils) {
        confLabel.textContent = confText;
      } else {
        confLabel.setAttribute('value', confText);
        confLabel.setAttribute('class', 'ner-creator-meta');
      }
      body.appendChild(confLabel);
    }

    groupDiv.appendChild(body);
    container.appendChild(groupDiv);

    this.setApplyEnabled(true);
  },

  clearSuggestions: function() {
    const container = this.htmlUtils ? this.htmlUtils.getElement('suggestions-container') : document.getElementById('suggestions-container');
    if (!container) return;

    if (this.htmlUtils) {
      this.htmlUtils.clearContainer('suggestions-container');
    } else {
      while (container.firstChild) container.removeChild(container.firstChild);
    }
  },

  setApplyEnabled: function(enabled) {
    const applyButton = this.htmlUtils ? this.htmlUtils.getElement('apply-button') : document.getElementById('apply-button');
    if (applyButton) {
      applyButton.disabled = !enabled || this.isProcessing;
    }
  },

  setDialogBusy: function(isBusy) {
    this.isProcessing = isBusy;
    this.showProgress(isBusy);

    const applyButton = this.htmlUtils ? this.htmlUtils.getElement('apply-button') : document.getElementById('apply-button');
    if (applyButton) {
      applyButton.disabled = isBusy;
    }
  },

  showProgress: function(show) {
    const progressContainer = this.htmlUtils ? this.htmlUtils.getElement('progress-container') : document.getElementById('progress-container');
    if (progressContainer) {
      if (this.htmlUtils) {
        this.htmlUtils.setHidden('progress-container', !show);
      } else {
        progressContainer.hidden = !show;
      }
    }
  },

  formatNameString: function(name) {
    if (typeof name === 'string') return name.trim();
    if (name && typeof name === 'object') {
      return `${name.firstName || ''} ${name.lastName || ''}`.trim();
    }
    return '';
  },

  updateProgress: function() {
    const progressLabel = this.htmlUtils ? this.htmlUtils.getElement('progress-label') : document.getElementById('progress-label');
    if (!progressLabel) return;

    if (this.analysisResults && this.analysisResults.suggestions) {
      if (this.isProcessing) {
        if (this.htmlUtils) {
          this.htmlUtils.updateProgressBar(50);
          this.htmlUtils.updateProgressLabel('Applying normalizations...');
        }
      } else {
        if (this.htmlUtils) {
          this.htmlUtils.updateProgressBar(100);
          this.htmlUtils.updateProgressLabel('Analysis complete: ' + this.analysisResults.suggestions.length + ' variant groups found');
        }
      }
    } else if (this.isProcessing) {
      if (this.htmlUtils) {
        this.htmlUtils.updateProgressBar(50);
        this.htmlUtils.updateProgressLabel('Analyzing library...');
      }
    } else {
      if (this.htmlUtils) {
        this.htmlUtils.updateProgressBar(0);
        this.htmlUtils.updateProgressLabel('Ready');
      }
    }
  },

  updateProgressBar: function(progress) {
    if (this.htmlUtils) {
      this.htmlUtils.updateProgressBar(progress.percent || 0);
      this.htmlUtils.updateProgressLabel(this.getProgressLabel(progress));
      return;
    }
    const progressMeter = document.getElementById('progress-meter');
    const progressLabel = document.getElementById('progress-label');
    if (!progressMeter || !progressLabel) return;

    if (progress && typeof progress.percent === 'number') {
      progressMeter.value = progress.percent;
      progressLabel.value = this.getProgressLabel(progress);
    }
  },

  getProgressLabel: function(progress) {
    switch (progress.stage) {
      case 'filtering_items':
        return `Finding items with creators: ${progress.processed}/${progress.total} (${progress.percent}%)`;
      case 'processing_items':
        return `Processing items: ${progress.processed}/${progress.total} (${progress.percent}%)`;
      case 'extracting_creators':
        return `Extracting creator data: ${progress.processed}/${progress.total} (${progress.percent}%)`;
      case 'analyzing_surnames':
        return `Analyzing surnames: ${progress.processed}/${progress.total} (${progress.percent}%)`;
      case 'complete':
        return 'Analysis complete';
      default:
        return 'Processing...';
    }
  },

  cancel: function() {
    window.close();
  },

  applySelected: async function() {
    if (this.isProcessing || !this.analysisResults || !this.dbAnalyzer) {
      return;
    }

    this.setDialogBusy(true);

    try {
      const results = await this.dbAnalyzer.applyNormalizationSuggestions(
        this.analysisResults.suggestions,
        false
      );

      this.alert('NER Author Name Normalizer',
        'Normalization suggestions applied!\n\n' +
        'Total suggestions: ' + results.totalSuggestions + '\n' +
        'Applied: ' + results.applied + '\n' +
        'Skipped: ' + results.skipped + '\n' +
        'Errors: ' + results.errors);

    } catch (error) {
      console.error(error);
      this.alert('Error', 'Failed to apply normalization suggestions: ' + error.message);
    } finally {
      this.setDialogBusy(false);
      window.close();
    }
  },

  createNode: function(tagName) {
    if (document.createXULElement) {
      try {
        return document.createXULElement(tagName);
      } catch (e) {}
    }
    return document.createElement(tagName);
  }
};
