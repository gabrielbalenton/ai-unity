import {test,expect,Page} from "@playwright/test";

async function primary(page:Page,isMobile:boolean,label:"Home"|"Projects"|"Conversations"|"Knowledge"){
 const nav=isMobile?page.getByRole("navigation",{name:"Mobile primary navigation"}):
  page.getByRole("navigation",{name:"Primary navigation"});
 await nav.getByRole("button",{name:label,exact:true}).click();
}
async function advanced(page:Page,isMobile:boolean,label:string){
 if(isMobile){
  await page.getByRole("navigation",{name:"Mobile primary navigation"}).getByRole("button",{name:"More",exact:true}).click();
 }else{
  await page.getByRole("navigation",{name:"Primary navigation"}).getByRole("button",{name:"More",exact:true}).click();
 }
 await page.getByRole("navigation",{name:"Primary navigation"}).getByRole("button",{name:new RegExp("^"+label)}).click();
}

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
 await primary(page,isMobile,"Knowledge");
 await expect(page.locator("h1")).toHaveText("Knowledge");
 await expect(page.getByText("Brain dump",{exact:true})).toBeVisible();
 await advanced(page,isMobile,"Integrations");
 await expect(page.locator("h1")).toHaveText("Integrations");
 await expect(page.getByText("Universal connections")).toBeVisible();
});

test("System Light Dark control is available and manual modes apply",async({page,isMobile})=>{
 await page.goto("/");
 let appearance;
 if(isMobile){
  await page.getByRole("navigation",{name:"Mobile primary navigation"}).getByRole("button",{name:"More",exact:true}).click();
  await page.getByRole("navigation",{name:"Primary navigation"}).getByRole("button",{name:"Settings",exact:true}).click();
  appearance=page.locator(".settings-grid").getByRole("combobox",{name:"Appearance"});
 }else{
  appearance=page.locator(".header-tools").getByRole("combobox",{name:"Appearance"});
 }
 await expect(appearance).toHaveValue("system");
 await appearance.selectOption("dark");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","dark");
 await appearance.selectOption("light");
 await expect(page.locator("html")).toHaveAttribute("data-resolved-theme","light");
});

test("project creation appears on the real Home without fake totals",async({page,isMobile})=>{
 await page.goto("/");
 await primary(page,isMobile,"Projects");
 await page.getByRole("textbox",{name:"Name",exact:true}).fill("Design smoke test");
 await page.getByRole("textbox",{name:"Description"}).fill("Local test project");
 await page.getByRole("button",{name:"Create project"}).click();
 await expect(page.locator(".entry").filter({hasText:"Design smoke test"})).toBeVisible();
 await primary(page,isMobile,"Home");
 await expect(page.locator(".project-card").filter({hasText:"Design smoke test"})).toBeVisible();
});

test("Settings owns backup and theme controls",async({page,isMobile})=>{
 await page.goto("/");
 if(isMobile){
  await page.getByRole("navigation",{name:"Mobile primary navigation"}).getByRole("button",{name:"More",exact:true}).click();
 }
 await page.getByRole("navigation",{name:"Primary navigation"}).getByRole("button",{name:"Settings",exact:true}).click();
 await expect(page.getByText("Backup and recovery")).toBeVisible();
 await expect(page.locator(".settings-grid").getByLabel("Appearance")).toBeVisible();
});
