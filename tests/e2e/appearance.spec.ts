import {test,expect} from "@playwright/test";
import {openAppearance} from "./helpers";

test("Light and Dark selections persist across reloads",async({page,isMobile})=>{
 await page.goto("/");
 let theme=await openAppearance(page,isMobile);
 await theme.selectOption("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await page.reload();
 theme=await openAppearance(page,isMobile);
 await expect(theme).toHaveValue("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await theme.selectOption("dark");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","dark");
});

test("System appearance responds to OS changes",async({page,isMobile})=>{
 await page.emulateMedia({colorScheme:"light"});
 await page.goto("/");
 const theme=await openAppearance(page,isMobile);
 await theme.selectOption("system");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await page.emulateMedia({colorScheme:"dark"});
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","dark");
 await theme.selectOption("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await page.emulateMedia({colorScheme:"dark"});
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
});
