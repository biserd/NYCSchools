// Cutover-only entrypoint: no application imports, DB writes, email or cron work.
// All requests, including GET token callbacks and Stripe deliveries, receive 503.
import {maintenanceResponse} from './maintenanceResponse';
export default {
 fetch(request:Request){return maintenanceResponse(request);},
 scheduled(){},
} satisfies ExportedHandler;
