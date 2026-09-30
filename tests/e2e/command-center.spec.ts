import {test,expect} from "@playwright/test";

test("command center renders real local statistics, tiles and responsive shell",async({page},testInfo)=>{
 await page.goto("/");
 await expect(page.locator("h1")).toHaveText("Mission Control");
 await expect(page.getByText("Every possibility.")).toBeVisible();
 await expect(page.getByText("External execution")).toBeVisible();
 await expect(page.getByText("Not connected",{exact:true}).first()).toBeVisible();
 await page.screenshot({path:testInfo.outputPath("unity-command-center.png"),fullPage:true});
});
test("workspace quick navigation works without connecting external services",async({page,isMobile})=>{
 await page.goto("/");
 if(isMobile){
  await page.getByRole("button",{name:"Open navigation"}).click();
  await expect(page.getByRole("navigation",{name:"Primary navigation"})).toBeVisible();
  await page.getByRole("button",{name:"Knowledge",exact:true}).click();
 }else{
  await page.getByRole("button",{name:"Open command menu"}).click();
  await page.getByRole("textbox",{name:"Search workspace destinations"}).fill("memory");
  await page.getByRole("button",{name:"Memory",exact:true}).click();
 }
 await expect(page.locator("h1")).toHaveText("Knowledge Core");
 await expect(page.getByText("Brain dump",{exact:true})).toBeVisible();
});
test("future system tiles reveal transparent roadmap details",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:/View all modules/}).click();
 await page.getByRole("button",{name:/Creative studio/}).click();
 const dialog=page.getByRole("dialog",{name:"Creative studio"});
 await expect(dialog).toBeVisible();
 await expect(dialog.getByText("not currently operational",{exact:false})).toBeVisible();
 await dialog.getByRole("button",{name:"Close roadmap details"}).click();
 await expect(dialog).toBeHidden();
});
test("existing project creation changes actual local totals",async({page})=>{
 await page.goto("/");
 await page.getByRole("button",{name:"Open workspace"}).click();
 await page.getByRole("textbox",{name:"Name",exact:true}).fill("Design smoke test");
 await page.getByRole("textbox",{name:"Description"}).fill("Local test project");
 await page.getByRole("button",{name:"Create project"}).click();
 await expect(page.getByText("Design smoke test")).toBeVisible();
 await page.getByRole("button",{name:"Mission Control"}).first().click();
 await expect(page.getByLabel("Current verified local workspace statistics").getByText("01")).toBeVisible();
});
