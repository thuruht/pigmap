from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Navigate to the correct leaflet.html page on the local dev server
        page.goto("http://localhost:8787/leaflet.html", wait_until="networkidle")

        # Wait for the map to be ready before proceeding
        expect(page.locator('#map')).to_be_visible(timeout=15000)

        # Click the "Report Location" button to open the form
        report_button = page.locator('#report-btn')
        expect(report_button).to_be_visible()
        report_button.click()

        # Wait for the report modal to appear
        expect(page.locator('#report-form')).to_be_visible(timeout=10000)

        # Fill out the report form
        page.locator('#type').select_option('sighting')
        page.locator('#comment').fill("Test report with image upload.")

        # Set the file for upload
        page.locator('#media').set_input_files('jules-scratch/verification/test-image.jpg')

        # Submit the form
        page.locator('#submit-report button[type="submit"]').click()

        # The app uses a native browser alert for success, which Playwright can handle.
        page.on("dialog", lambda dialog: dialog.accept())

        # Wait a moment for the submission to process and the alert to potentially appear
        time.sleep(2)

        # Take a screenshot to confirm the report was submitted and the UI is stable
        page.screenshot(path="jules-scratch/verification/verification.png")

        print("Verification script completed successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)