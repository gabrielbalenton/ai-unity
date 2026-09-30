import {test,expect,Page} from "@playwright/test";

async function openReadiness(page:Page,isMobile:boolean){
 if(isMobile){
  await page.getByRole("navigation",{name:"Mobile primary navigation"}).getByRole("button",{name:"More",exact:true}).click();
 }else{
  await page.getByRole("navigation",{name:"Primary navigation"}).getByRole("button",{name:"More",exact:true}).click();
 }
 await page.getByRole("navigation",{name:"Primary navigation"}).getByRole("button",{name:/^Release Readiness/}).click();
}

test("release readiness renders real gates with no fake verification and captures responsive UI",async({page,isMobile},testInfo)=>{
 await page.goto("/");
 await openReadiness(page,isMobile);
 await expect(page.locator("h1")).toHaveText("Release Readiness");
 await expect(page.getByText("RELEASE LOCKED",{exact:true}).first()).toBeVisible();
 await expect(page.getByText("Evidence before launch.")).toBeVisible();
 await expect(page.getByText("0 / 10")).toBeVisible();
 await page.getByRole("button",{name:"Dedicated backend and authentication"}).click();
 await expect(page.getByText("Two authenticated test accounts")).toBeVisible();
 await page.getByRole("button",{name:"Personal trial"}).click();
 await expect(page.getByText("Personal usage baseline")).toBeVisible();
 await page.screenshot({path:testInfo.outputPath("unity-release-readiness.png"),fullPage:true});
});
