# Feature: Google Drive Dual-Mode Integration

**GitHub Issue:** #124 - Google Drive integration with OAuth2 and shared folders  
**Epic:** File Management & Integrations  
**Priority:** High  
**Tags:** google-drive, oauth2, file-integration, supplier-portal

The BuildTrack application supports two modes for accessing Google Drive PDFs: shared folder URLs (using service account) and personal Google account access (using OAuth2), enabling flexible file import workflows for both admin and supplier users.

## Background

Given the application is running
And Google Drive integration is configured
And I am logged in as a "user"

<!-- @critical,google-drive,oauth2 -->

## Scenario: Connect personal Google account via OAuth2

**As a** project manager  
**I want** to connect my personal Google account  
**So that** I can import PDFs from my own Google Drive

Given I am on the "settings" page
And I navigate to the "Google Integrations" section
When I click the "Connect Google Drive" button
Then I should see a popup window with "Google account sign-in"
When I complete the Google OAuth2 flow with valid credentials
Then I should see "Google Drive connected successfully"
And the connection status should show "Connected"
And I should see my Google account email

<!-- @high,google-drive,file-import -->

## Scenario: Import PDFs from personal Google Drive

**As a** user with connected Google account  
**I want** to import PDFs from my Google Drive  
**So that** I can process invoices without manual upload

Given I have a connected Google account
And my Google Drive contains PDF files
When I visit "/invoices"
And I click the "Import from Google Drive" button
Then I should see "Personal Google Drive" option
When I select "Personal Google Drive"
Then I should see a list of my PDF files
When I select 3 PDF files
And I click the "Import Selected" button
Then I should see "Processing 3 files from Google Drive"
And I wait for "AI processing" to complete
And I should see 3 imported invoices

<!-- @medium,google-drive,shared-folders -->

## Scenario: Import PDFs from shared Google Drive folder

**As a** user  
**I want** to import PDFs from a shared Google Drive folder  
**So that** I can process supplier invoices from shared locations

Given I am on the "invoices" page
When I click the "Import from Google Drive" button
And I select "Shared Folder" option
And I enter "https://drive.google.com/drive/folders/abc123" in the folder URL field
And I click the "Load Files" button
Then I should see "Scanning folder for PDF files"
And I wait for "folder scanning" to complete
And I should see a list of PDF files from the folder
When I select all available files
And I click the "Import Selected" button
Then I should see "Processing files from shared folder"

<!-- @high,google-drive,recursive-search -->

## Scenario: Recursive folder PDF discovery

**As a** user  
**I want** the system to find PDFs in subfolders  
**So that** I don't miss files organized in nested folders

Given I have a Google Drive folder with subfolders
And the folder structure contains:

- Root folder: 2 PDFs
- Subfolder "January": 3 PDFs
- Subfolder "February": 2 PDFs
  When I enter the root folder URL
  And I click the "Load Files" button
  Then I should see "Scanning folder recursively"
  And I should see 7 total PDF files listed
  And files should be labeled with their folder path
  And I should see "January/invoice-001.pdf"
  And I should see "February/invoice-005.pdf"

<!-- @critical,supplier-portal,google-drive -->

## Scenario: Supplier portal dual-mode access

**As a** supplier  
**I want** to choose between shared folder and personal account  
**So that** I can use the most convenient access method

Given I am on the supplier portal at "/portal"
And I have validated my email
When I navigate to the "Upload Invoice" tab
Then I should see "Google Drive Import" option
When I click "Google Drive Import"
Then I should see both access methods:

- "Enter Shared Folder URL"
- "Connect Your Google Account"
  When I select "Connect Your Google Account"
  And I complete the OAuth2 flow
  Then I should see "Connected to [my email]"
  And I should be able to browse my personal Drive files

<!-- @medium,google-drive,error-handling -->

## Scenario: Handle invalid Google Drive URLs

**As a** user  
**I want** clear error messages for invalid folder URLs  
**So that** I can correct the URL format

Given I am on the Google Drive import screen
When I enter "not-a-google-drive-url" in the folder URL field
And I click the "Load Files" button
Then I should see "Invalid Google Drive URL format"
When I enter "https://drive.google.com/file/d/abc123" in the folder URL field
And I click the "Load Files" button
Then I should see "Please provide a folder URL, not a file URL"

<!-- @high,google-drive,oauth2-errors -->

## Scenario: Handle OAuth2 authentication errors

**As a** user  
**I want** clear guidance when OAuth2 fails  
**So that** I can resolve authentication issues

Given I am attempting to connect my Google account
When the OAuth2 flow fails with "access_denied"
Then I should see "Google account connection was cancelled"
And I should see "Try again" button
When the OAuth2 flow fails with "invalid_client"
Then I should see "Google integration configuration error"
And I should see "Please contact support"

<!-- @medium,google-drive,token-refresh -->

## Scenario: Automatic OAuth2 token refresh

**As a** user with expired Google tokens  
**I want** automatic token refresh  
**So that** my Google Drive access continues working

Given I have a connected Google account
And my OAuth2 tokens have expired
When I try to access Google Drive files
Then I should see "Refreshing Google Drive connection"
And the system should automatically refresh my tokens
And I should see my Google Drive files
But if token refresh fails
Then I should see "Please reconnect your Google account"

<!-- @low,google-drive,file-types -->

## Scenario: Filter non-PDF files

**As a** user  
**I want** to see only PDF files from Google Drive  
**So that** I don't waste time with irrelevant files

Given my Google Drive folder contains:

- invoice.pdf
- document.docx
- image.jpg
- another-invoice.pdf
  When I load files from the folder
  Then I should see 2 files listed
  And I should see "invoice.pdf"
  And I should see "another-invoice.pdf"
  But I should not see "document.docx"
  And I should not see "image.jpg"

---

## Test Data Requirements

```yaml
google_drive_test_data:
  shared_folder:
    url: 'https://drive.google.com/drive/folders/test123'
    files:
      - 'invoice-001.pdf'
      - 'invoice-002.pdf'
      - 'January/invoice-jan-01.pdf'
      - 'February/invoice-feb-01.pdf'

  oauth2_credentials:
    client_id: 'test-client-id.googleusercontent.com'
    client_secret: 'test-client-secret'
    redirect_uri: 'http://localhost:3000/api/auth/google/callback'

  test_files:
    valid_pdf: 'test-invoice.pdf'
    invalid_file: 'document.docx'
```

## Acceptance Criteria

- [ ] OAuth2 authentication flow works end-to-end
- [ ] Personal Google Drive files can be listed and selected
- [ ] Shared folder URLs are validated and processed
- [ ] Recursive folder scanning finds all PDFs
- [ ] Supplier portal supports both access modes
- [ ] Error handling covers all failure scenarios
- [ ] Token refresh works automatically
- [ ] Only PDF files are shown in file lists
- [ ] File import integrates with existing invoice processing

## Integration Points

- Settings management for OAuth2 credentials
- Invoice processing pipeline for imported files
- Supplier portal email validation
- AI processing for imported PDFs
- Error reporting and user notifications

## Security Considerations

- OAuth2 tokens stored securely per user
- Service account keys protected
- Folder access permissions validated
- No sensitive data in error messages
