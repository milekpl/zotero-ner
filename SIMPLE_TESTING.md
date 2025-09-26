# Simplified Extension Testing

I have created a simplified version of the extension to diagnose the issue. Please follow these steps to test it:

1.  **Install the Extension:**
    *   Open Zotero.
    *   Go to `Tools` -> `Add-ons`.
    *   Click the gear icon and select `Install Add-on From File...`.
    *   Select the `.xpi` file from the `dist` directory.
    *   Restart Zotero.

2.  **Test the Dialog:**
    *   In Zotero, go to the `Tools` menu.
    *   You should see a new menu item called `Simple Dialog Test`.
    *   Click on it.

3.  **Expected Result:**
    *   A small dialog window should appear with the title "Simple Dialog".
    *   The dialog should contain the text "This is a simple dialog." and a button labeled "Click Me".
    *   Clicking the "Click Me" button should show an alert with the message "Hello from the simple dialog!".

Please let me know if this simplified version works. This will help me determine if the problem is with my code or with the Zotero extension framework.
