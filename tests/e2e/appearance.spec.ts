import {test,expect,Page} from "@playwright/test";

async function appearanceControl(page:Page,isMobile:boolean){
 if(isMobile){
  await page.getByRole("navigation",{name:"Mobile primary navigation"}).getByRole("button",{name:"More",exact:true}).click();
  await page.getByRole("navigation",{name:"Primary navigation"}).getByRole("button",{name:"Settings",exact:true}).click();
  return page.locator(".settings-grid").getByRole("combobox",{name:"Appearance"});
 }
 return page.locator(".header-tools").getByRole("combobox",{name:"Appearance"});
}

test("Light and Dark selections persist across reloads",async({page,isMobile})=>{
 await page.goto("/");
 let theme=await appearanceControl(page,isMobile);
 await theme.selectOption("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await page.reload();
 theme=await appearanceControl(page,isMobile);
 await expect(theme).toHaveValue("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await theme.selectOption("dark");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","dark");
});

test("System appearance responds to OS changes",async({page,isMobile})=>{
 await page.emulateMedia({colorScheme:"light"});
 await page.goto("/");
 const theme=await appearanceControl(page,isMobile);
 await theme.selectOption("system");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await page.emulateMedia({colorScheme:"dark"});
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","dark");
 await theme.selectOption("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
 await page.emulateMedia({colorScheme:"dark"});
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
});
