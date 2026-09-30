import {test,expect,Page} from "@playwright/test";

async function primary(page:Page,isMobile:boolean,label:"Projects"|"Conversations"){
 const nav=isMobile?page.getByRole("navigation",{name:"Mobile primary navigation"}):
  page.getByRole("navigation",{name:"Primary navigation"});
 await nav.getByRole("button",{name:label,exact:true}).click();
}

test("conversation composer records a scoped local note with an accessible mobile flow",async({page,isMobile},testInfo)=>{
 await page.goto("/");
 await primary(page,isMobile,"Projects");
 await page.getByRole("textbox",{name:"Name",exact:true}).fill("Conversation design test");
 await page.getByRole("textbox",{name:"Description"}).fill("Isolated browser-only workspace");
 await page.getByRole("button",{name:"Create project"}).click();
 await primary(page,isMobile,"Conversations");
 await expect(page.getByText("Start with a thought.")).toBeVisible();
 await page.getByRole("button",{name:"Capture an idea"}).click();
 const composer=page.getByRole("textbox",{name:"Local conversation note"});
 await expect(composer).toHaveValue("Idea: ");
 await composer.fill("Idea: Create a durable universal workspace");
 await page.getByRole("button",{name:"Save note"}).click();
 await expect(page.getByText("Idea: Create a durable universal workspace")).toBeVisible();
 await expect(page.getByText("LOCAL NOTE · NOT SENT TO AI")).toBeVisible();
 await page.screenshot({path:testInfo.outputPath("unity-conversation-studio.png"),fullPage:true});
});
