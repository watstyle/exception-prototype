import { expect, test } from "@playwright/test";

test("category click shows embedded iframe and row click opens full screen detail", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("category-groundtruth-exceptions").click();
  await expect(page.getByTestId("groundtruth-list-iframe")).toBeVisible();

  const listFrame = page.frameLocator("iframe[title='Groundtruth List Iframe']");
  await listFrame.locator("tbody tr").first().click();

  await expect(page.getByTestId("detail-overlay")).toBeVisible();
  await expect(page.getByTestId("groundtruth-detail-iframe")).toBeVisible();

  const detailFrame = page.frameLocator("iframe[title='Groundtruth Detail Iframe']");
  await detailFrame.getByRole("button", { name: "Exit detail view" }).click();

  await expect(page.getByTestId("detail-overlay")).toBeHidden();
});

test("non-groundtruth category hides iframe pane", async ({ page }) => {
  await page.goto("/");

  await page.getByTestId("category-groundtruth-exceptions").click();
  await expect(page.getByTestId("groundtruth-pane")).toBeVisible();

  await page.getByTestId("category-accessory-rules").click();
  await expect(page.getByTestId("host-native-pane")).toBeVisible();
});
