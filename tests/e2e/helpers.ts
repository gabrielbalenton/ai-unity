import type {Page} from "@playwright/test";

function sidebarNavigation(page:Page){
 return page.locator('aside.sidebar nav[aria-label="Primary navigation"]');
}
export async function openPrimary(page:Page,label:string,isMobile:boolean){
 if(isMobile)await page.getByRole("button",{name:"Open navigation"}).click();
 const nav=sidebarNavigation(page);
 await nav.getByRole("button",{name:label,exact:true}).click();
}
export async function openAdvanced(page:Page,label:string,isMobile:boolean){
 if(isMobile)await page.getByRole("button",{name:"Open navigation"}).click();
 const nav=sidebarNavigation(page);
 const more=nav.getByRole("button",{name:"More",exact:true});
 if(await more.getAttribute("aria-expanded")!=="true")await more.click();
 await nav.getByRole("button",{name:label,exact:true}).click();
}
export async function openAppearance(page:Page,isMobile:boolean){
 if(isMobile){
  await openPrimary(page,"Settings",true);
  return page.getByRole("combobox",{name:"Appearance"}).last();
 }
 return page.getByRole("combobox",{name:"Appearance"}).first();
}
