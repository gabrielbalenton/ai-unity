import {defineConfig,devices} from "@playwright/test";

export default defineConfig({
 testDir:"./tests/e2e",
 fullyParallel:false,
 retries:0,
 workers:1,
 timeout:45000,
 reporter:[["list"],["html",{open:"never"}]],
 use:{
  baseURL:"http://127.0.0.1:3000",
  trace:"retain-on-failure",
  screenshot:"only-on-failure",
  actionTimeout:15000
 },
 projects:[
  {name:"desktop-chromium",use:{...devices["Desktop Chrome"],viewport:{width:1440,height:900}}},
  {name:"tablet-chromium",use:{...devices["Desktop Chrome"],viewport:{width:768,height:1024}}},
  {name:"mobile-chromium",use:{...devices["Desktop Chrome"],viewport:{width:375,height:812},isMobile:true,hasTouch:true}}
 ],
 webServer:{
  command:"npm run start -- -H 127.0.0.1 -p 3000",
  url:"http://127.0.0.1:3000",
  reuseExistingServer:!process.env.CI,
  timeout:120000
 }
});
