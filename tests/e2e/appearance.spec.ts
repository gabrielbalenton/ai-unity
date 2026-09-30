import {test,expect} from "@playwright/test";

test("Light and Dark selections persist across reloads",async({page})=>{
 await page.goto("/");
 const theme=page.getByRole("combobox",{name:"Appearance"});
 await theme.selectOption("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await page.reload();
 await expect(page.getByRole("combobox",{name:"Appearance"})).toHaveValue("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await page.getByRole("combobox",{name:"Appearance"}).selectOption("dark");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","dark");
});

test("System appearance responds to OS changes",async({page})=>{
 await page.emulateMedia({colorScheme:"light"});
 await page.goto("/");
 const theme=page.getByRole("combobox",{name:"Appearance"});
 await theme.selectOption("system");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await page.emulateMedia({colorScheme:"dark"});
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","dark");
 await theme.selectOption("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await page.emulateMedia({colorScheme:"dark"});
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
});
