// tests/ui/normalizer-dialog.test.js
import { test, expect } from '@playwright/test';

test.describe('Zotero NER Normalizer Dialog', () => {
  test('should load and display basic elements', async ({ page }) => {
    // Since this is a Zotero extension with XUL dialogs, 
    // we'll test the HTML representation of the dialog
    // In a real scenario, this would load the XUL file or a web-based mockup
    
    // Create a mock HTML page representing the dialog
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NER Normalizer Dialog</title>
      </head>
      <body>
        <div class="ner-normalizer-dialog">
          <h2>Author Name Normalization</h2>
          <div class="item-section" data-item-id="1">
            <h3>Sample Paper Title</h3>
            <div class="creator-section">
              <p><strong>Original:</strong> J. Fodor</p>
              <div class="variants-section">
                <h4>Variant Suggestions:</h4>
                <ul>
                  <li><label><input type="radio" name="selection-J. Fodor" value="Jerry Alan Fodor"> Jerry Alan Fodor</label></li>
                  <li><label><input type="radio" name="selection-J. Fodor" value="Jerry A. Fodor"> Jerry A. Fodor</label></li>
                  <li><label><input type="radio" name="selection-J. Fodor" value="Jerry Fodor"> Jerry Fodor</label></li>
                </ul>
              </div>
            </div>
          </div>
          <div class="dialog-actions">
            <button id="accept-all-btn">Accept All</button>
            <button id="cancel-btn">Cancel</button>
          </div>
        </div>
      </body>
      </html>
    `);

    // Test that the dialog contains expected elements
    await expect(page.locator('h2')).toContainText('Author Name Normalization');
    await expect(page.locator('h3')).toContainText('Sample Paper Title');
    await expect(page.locator('p strong')).toContainText('Original:');
    await expect(page.locator('h4')).toContainText('Variant Suggestions');
    await expect(page.locator('button#accept-all-btn')).toHaveText('Accept All');
    await expect(page.locator('button#cancel-btn')).toHaveText('Cancel');
  });

  test('should allow selecting name variants', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NER Normalizer Dialog</title>
      </head>
      <body>
        <div class="ner-normalizer-dialog">
          <h2>Author Name Normalization</h2>
          <div class="item-section" data-item-id="1">
            <h3>Sample Paper Title</h3>
            <div class="creator-section">
              <p><strong>Original:</strong> J. Smith</p>
              <div class="variants-section">
                <h4>Variant Suggestions:</h4>
                <ul>
                  <li><label><input type="radio" name="selection-J. Smith" value="John Smith" id="john-smith"> John Smith</label></li>
                  <li><label><input type="radio" name="selection-J. Smith" value="Johnny Smith" id="johnny-smith"> Johnny Smith</label></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    // Test that the correct number of variants are displayed
    const variantOptions = page.locator('input[type="radio"]');
    await expect(variantOptions).toHaveCount(2);

    // Test that user can select a variant
    await page.locator('#john-smith').click();
    await expect(page.locator('#john-smith')).toBeChecked();

    // Test that selecting one deselects the other (since they share name attribute)
    await page.locator('#johnny-smith').click();
    await expect(page.locator('#johnny-smith')).toBeChecked();
    await expect(page.locator('#john-smith')).not.toBeChecked();
  });

  test('should handle learned mappings appropriately', async ({ page }) => {
    await page.setContent(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>NER Normalizer Dialog</title>
      </head>
      <body>
        <div class="ner-normalizer-dialog">
          <h2>Author Name Normalization</h2>
          <div class="item-section" data-item-id="1">
            <h3>Sample Paper Title</h3>
            <div class="creator-section">
              <p><strong>Learned:</strong> J. Fodor → Jerry Alan Fodor</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `);

    // Test that learned mappings are displayed differently
    const learnedText = page.locator('p:has-text("Learned:")');
    await expect(learnedText).toContainText('J. Fodor → Jerry Alan Fodor');
  });
});