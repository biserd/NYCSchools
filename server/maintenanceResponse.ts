export function maintenanceResponse(request: Request): Response {
  const headers={'Cache-Control':'no-store','Retry-After':'120','X-Migration-Maintenance':'true'};
  if(new URL(request.url).pathname.startsWith('/api/'))return Response.json({message:'Database maintenance in progress. Please try again shortly.'},{status:503,headers});
  return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Brief maintenance — NYC School Ratings</title><body style="font:18px system-ui;max-width:640px;margin:12vh auto;padding:24px"><h1>We’ll be back shortly</h1><p>NYC School Ratings is completing a database upgrade. Your account and saved schools are being preserved.</p><p>Please try again in a few minutes.</p></body></html>',{status:503,headers:{...headers,'Content-Type':'text/html; charset=utf-8'}});
}
