import {test,expect} from "@playwright/test";

test("approved Home is calm, honest and screenshot-ready",async({page},testInfo)=>{
 await page.goto("/");
 await expect(page.locator("h1")).toHaveText("Home");
 await expect(page.getByText(/Welcome to|Ready when you are/).first()).toBeVisible();
 await expect(page.getByPlaceholder("What would you like to work on?")).toBeVisible();
 await expect(page.getByText(/External execution and paid APIs remain disabled/)).toBeVisible();
 await expect(page.getByText("System overview")).toHaveCount(0);
 await page.screenshot({path:testInfo.outputPath("unity-home.png"),fullPage:true});
});

test("primary and advanced navigation both preserve working pages",async({page,isMobile})=>{
 await page.goto("/");
 if(isMobile){
  await page.getByRole("button",{name:"Open navigation"}).click();
 }
 await page.getByRole("button",{name:"Knowledge",exact:true}).click();
 await expect(page.locator("h1")).toHaveText("Knowledge");
 await expect(page.getByText("Brain dump",{exact:true})).toBeVisible();
 if(isMobile)await page.getByRole("button",{name:"Open navigation"}).click();
 await page.getByRole("button",{name:"More",exact:true}).click();
 await page.getByRole("button",{name:/Integrations/}).click();
 await expect(page.locator("h1")).toHaveText("Integrations");
 await expect(page.getByText("Universal connections")).toBeVisible();
});

test("System Light Dark control is available and manual modes apply",async({page})=>{
 await page.goto("/");
 const appearance=page.getByLabel("Appearance").first();
 await expect(appearance).toHaveValue("system");
 await appearance.selectOption("dark");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","dark");
 await appearance.selectOption("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
});

test("project creation appears on the real Home without fake totals",async({page,isMobile})=>{
 await page.goto("/");
 if(isMobile)await page.getByRole("button",{name:"Open navigation"}).click();
 await page.getByRole("button",{name:"Projects",exact:true}).click();
 await page.getByRole("textbox",{name:"Name",exact:true}).fill("Design smoke test");
 await page.getByRole("textbox",{name:"Description"}).fill("Local test project");
 await page.getByRole("button",{name:"Create project"}).click();
 await expect(page.getByText("Design smoke test")).toBeVisible();
 if(isMobile){
  await page.getByRole("button",{name:"Home",exact:true}).last().click();
 }else{
  await page.getByRole("button",{name:"Home",exact:true}).click();
 }
 await expect(page.getByRole("button",{name:/Design smoke test/})).toBeVisible();
});

test("Settings owns backup and theme controls",async({page,isMobile})=>{
 await page.goto("/");
 if(isMobile)await page.getByRole("button",{name:"Open navigation"}).click();
 await page.getByRole("button",{name:"Settings",exact:true}).click();
 await expect(page.getByText("Backup and recovery")).toBeVisible();
 await expect(page.getByLabel("Appearance").last()).toBeVisible();
});
