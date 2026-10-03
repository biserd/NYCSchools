import React, { type ReactNode } from 'react';

function Topic({ title, children }: { title: string; children: ReactNode }) {
  return <section className="kl-policy-topic"><h2>{title}</h2>{children}</section>;
}
function List({ items }: { items: string[] }) {
  return <ul>{items.map(item => <li key={item}>{item}</li>)}</ul>;
}
function Email() {
  return <a href="mailto:hello@bigappledigital.nyc">hello@bigappledigital.nyc</a>;
}
function Operator() {
  return <p><strong>Big Apple Digital LLC</strong><br/><strong>Email:</strong> <Email/></p>;
}
// Owner-supplied policy, September 26, 2026. The owner confirmed no AI training,
// the 24-month inactivity policy, seven-day recovery window and no in-app GA.
export function KinderLearnerPrivacy() {
  return <>
    <Topic title="1. Who we are">
      <p>KinderLearner is operated by:</p><Operator/>
      <p>This Privacy Policy explains how KinderLearner handles information in the KinderLearner iPhone and iPad app, optional parent accounts and cloud synchronization, parent support, and the KinderLearner marketing pages.</p>
      <p>KinderLearner&apos;s child-facing app and the broader NYC Schools Ratings service are separate experiences. NYC Schools Ratings accounts, family-calendar features and subscriptions are covered by the separate <a href="/privacy">NYC Schools Ratings Privacy Policy</a>.</p>
    </Topic>
    <Topic title="2. Privacy at a glance">
      <p>KinderLearner is designed so a child can use the app without creating an online account.</p><p>In Guest Mode:</p>
      <List items={["the child's learning profile and activity history stay on the device;", 'the child does not need an email address or online account;', 'no advertising is displayed;', 'KinderLearner does not use third-party behavioral advertising or third-party analytics in the child-facing app; and', "the child's learning records are not uploaded to KinderLearner's cloud service unless a parent chooses to enable cloud sync."]}/>
      <p>A parent may optionally create a parent account and enable cloud sync. Before child learning information is uploaded, the parent is shown a separate notice explaining what will be collected, why it is collected, and how the parent can provide or withdraw authorization.</p>
    </Topic>
    <Topic title="3. Guest play and information stored on the device">
      <p>A parent may start using KinderLearner without creating an online account.</p><p>In Guest Mode, KinderLearner may store the following information locally on the device:</p>
      <List items={['a child nickname;', 'selected avatar;', 'activity attempts and answers;', 'learning progress and skill evidence;', 'saved and completed quests;', 'stars; and', 'virtual treasures.']}/>
      <p>Guest Mode records are not uploaded to KinderLearner&apos;s account or synchronization service unless a parent enters Parent Mode, chooses to connect the child&apos;s profile to a parent account, completes the required authorization process, and enables cloud sync.</p>
      <p>We recommend using a nickname rather than a child&apos;s full legal name.</p><p>KinderLearner does not ask a child to provide:</p>
      <List items={['an email address;', 'telephone number;', 'home address;', 'exact location;', 'photograph;', 'date of birth; or', 'password.']}/>
      <p>Information stored locally may also be included in device backups depending on the parent&apos;s Apple and device-backup settings. Apple controls those backup services under Apple&apos;s own terms and privacy policies.</p>
    </Topic>
    <Topic title="4. Children's information when cloud sync is enabled">
      <p>Cloud sync is optional.</p><p>When a parent authorizes cloud sync for a child&apos;s profile, KinderLearner may upload and maintain:</p>
      <List items={['child nickname;', 'selected avatar;', 'exercise answers;', 'activity and attempt history;', 'dates and times associated with learning activity;', 'skill evidence and learning progress;', 'saved and completed quests;', 'stars; and', 'virtual treasures.']}/>
      <p>KinderLearner uses this information to:</p>
      <List items={["synchronize learning progress across authorized devices;", "restore the child's learning profile;", 'choose appropriate learning activities;', 'maintain learning progress;', 'provide parent-facing learning guidance; and', 'operate and secure the service.']}/>
      <p>KinderLearner does not make children&apos;s profiles public and does not provide child-to-child messaging.</p>
    </Topic>
    <Topic title="5. Parent accounts">
      <p>Parent accounts are intended for a parent or legal guardian.</p><p>To create or use a parent account, KinderLearner may collect:</p>
      <List items={['parent email address;', 'verified account identifier;', 'authentication and session information;', 'IP address;', 'request and device information used for security and abuse prevention; and', 'records of consent or account choices where required.']}/>
      <p>Parent accounts use an email verification process. There is no child email login or child password.</p>
      <p>Parent contact information used to obtain any required parental authorization will not be used for unrelated marketing unless the parent separately chooses to receive such communications.</p>
    </Topic>
    <Topic title="6. Parental authorization for cloud sync">
      <p>KinderLearner does not upload a Guest Mode child&apos;s learning profile to the cloud merely because a parent creates an account.</p><p>Before cloud sync for a child is enabled, the parent is provided a separate notice describing:</p>
      <List items={["the children's information KinderLearner proposes to collect;", 'why that information is collected;', 'how it is used;', 'the service providers involved in operating the service;', 'how the parent may provide authorization;', 'how the parent may later stop further collection; and', "how the parent may review or delete the child's cloud information."]}/>
      <p>KinderLearner will not begin uploading the child&apos;s cloud-sync information until the required parental authorization process has been completed.</p>
      <p>A parent may later turn off cloud sync and may request deletion of information already stored in the cloud as described below.</p>
    </Topic>
    <Topic title="7. Turning off cloud sync">
      <p>A parent may turn off cloud sync from Parent Mode.</p><p>When cloud sync is turned off:</p>
      <List items={["the device stops uploading new learning information for that profile to KinderLearner's cloud service; and", 'information already stored in the cloud is not automatically deleted unless the parent also chooses to delete the cloud data or account.']}/>
      <p>Where available, KinderLearner will provide the parent with separate choices to:</p>
      <ol><li>turn off future synchronization;</li><li>delete the child&apos;s cloud learning data; or</li><li>delete the entire parent account and associated cloud family records.</li></ol>
      <p>Turning off cloud sync does not remove copies already stored locally on the parent&apos;s devices.</p>
    </Topic>
    <Topic title="8. How we use information">
      <p>KinderLearner uses information only as reasonably necessary to:</p>
      <List items={['provide learning activities;', 'maintain and restore learning progress;', "personalize activity selection according to the child's learning history;", 'provide parent guidance;', 'synchronize authorized profiles across devices;', 'authenticate parent accounts;', 'prevent fraud, abuse and unauthorized access;', 'respond to support requests; and', 'comply with applicable legal obligations.']}/>
      <p>KinderLearner does not use children&apos;s learning records for behavioral advertising.</p>
    </Topic>
    <Topic title="9. What KinderLearner does not do">
      <p>KinderLearner does not:</p>
      <List items={["sell children's personal information;", "use children's learning records for targeted advertising;", "create advertising profiles based on children's learning activity;", 'display third-party behavioral advertising in the child-facing app;', 'provide public child profiles;', 'provide child-to-child messaging; or', "send a child's answers to a live generative-AI chat model as part of the current learning planner."]}/>
      <p>KinderLearner does not use children&apos;s learning records to train generative AI models.</p>
    </Topic>
    <Topic title="10. Narration and learning decisions">
      <p>Marin and Cedar are AI-generated adult narration voices whose audio files are included with the app and play locally.</p>
      <p>Children&apos;s information is not sent to the service that generated those voice recordings when a child listens to them.</p>
      <p>Some older or fallback instructions may use Apple&apos;s on-device speech capabilities.</p>
      <p>KinderLearner&apos;s current learning planner runs using curriculum, learning evidence and scheduling rules implemented by the app. It is not a live AI chat service sending a child&apos;s answers to a generative model.</p>
      <p>Learning progress estimates are educational tools. They are not medical, psychological or developmental diagnoses.</p>
    </Topic>
    <Topic title="11. Service providers">
      <p>KinderLearner uses service providers to operate the optional online portions of the service.</p>
      <h3>Cloudflare</h3><p><strong>Cloudflare, Inc.</strong> provides services that may include:</p>
      <List items={['application and network infrastructure;', 'database storage (Cloudflare D1);', 'network and security services;', 'abuse prevention; and', 'request processing.']}/>
      <p>Depending on the feature being used, Cloudflare may process information such as:</p>
      <List items={['parent account identifiers;', 'authorized child synchronization records;', 'IP addresses;', 'request information; and', 'security-related information.']}/>
      <p>Cloudflare processes this information to provide services to KinderLearner and not for KinderLearner&apos;s behavioral advertising.</p>
      <h3>Verification-email delivery</h3><p><strong>Cloudflare, Inc.</strong> processes the parent&apos;s email address and information required to deliver account-verification or security messages.</p>
      <p>We require service providers handling KinderLearner information to use that information for the services they provide to us and subject to applicable contractual and legal requirements.</p>
    </Topic>
    <Topic title="12. Security">
      <p>KinderLearner uses administrative, technical and organizational safeguards intended to protect information appropriate to its nature.</p><p>For example:</p>
      <List items={['app-to-service communications use authenticated encrypted connections;', 'authentication credentials are stored using platform security features such as the iOS Keychain where applicable;', 'access to cloud information is restricted according to service needs; and', 'account verification and rate limiting are used to reduce unauthorized access and abuse.']}/>
      <p>No storage or transmission system can guarantee absolute security.</p>
      <p>If we learn of a security event affecting personal information, we will respond in accordance with applicable law.</p>
    </Topic>
    <Topic title="13. Retention">
      <p>KinderLearner retains personal information only for as long as reasonably necessary for the specific purpose for which it was collected, subject to applicable legal obligations.</p>
      <h3>Guest Mode</h3><p>Guest learning information remains on the device until the parent deletes the profile, deletes the app and its data, or otherwise removes the local information.</p>
      <p>Offloading an app through Apple&apos;s device-management features may preserve local app data.</p>
      <h3>Parent account and synchronized learning information</h3><p>Parent-account and synchronized learning information are retained while reasonably necessary to provide account access, synchronization, restoration and learning-history features.</p>
      <p>If a parent account remains inactive for 24 months, KinderLearner may notify the parent and schedule the cloud account and associated synchronized learning information for deletion unless the parent returns to the service or applicable law requires longer retention.</p>
      <p>We do not retain children&apos;s personal information indefinitely merely because an account once existed.</p>
      <h3>Authentication and security records</h3><p>Verification codes expire after approximately ten minutes.</p>
      <p>Expired verification records, session records, abuse-prevention records and similar operational information are removed according to their configured retention schedules when no longer reasonably necessary.</p>
      <h3>Recovery copies</h3><p>When information is deleted from the active database, prior database states may remain temporarily recoverable through infrastructure disaster-recovery systems for a limited recovery period.</p>
      <p>Such recovery copies may remain recoverable for up to 7 days before they expire and are not used for ordinary application purposes.</p>
      <p>Apple-managed device backups are controlled separately through the parent&apos;s Apple settings.</p>
    </Topic>
    <Topic title="14. Access, correction, deletion and stopping further collection">
      <p>A parent may ask to:</p><List items={["review children's personal information associated with the parent's account;", 'correct that information;', "delete children's cloud information;", 'delete the parent account; or', "refuse or withdraw permission for further collection or use of the child's cloud information."]}/>
      <p>Parents may use the available controls in Parent Mode or contact us at:</p><p><Email/></p>
      <p>We may take reasonable steps to verify that a request comes from the relevant parent, guardian or authorized person before providing access to or deleting account information.</p>
      <p>Please do not email identity documents unless we have specifically provided a secure method for doing so.</p>
    </Topic>
    <Topic title="15. Deleting an account">
      <p>A parent can request account deletion from:</p><p><strong>Parent Mode → Parent account &amp; sync → Delete account</strong></p>
      <p>The parent may be required to verify account control before deletion.</p>
      <p>Deleting the account removes the parent account and associated active cloud family records and invalidates applicable account sessions.</p>
      <p>Information previously synchronized to another authorized device may remain stored locally on that device until it is separately deleted there.</p>
      <p>Deleting one parent account does not automatically delete unrelated Guest Mode profiles or records belonging to a different account.</p>
      <p>Deleting local app data alone does not necessarily delete a cloud account. Likewise, deleting a cloud account does not automatically erase local copies stored on every other device.</p>
      <p>For additional instructions, see: <a href="/kinderlearner/delete-data">KinderLearner Data &amp; Deletion Requests</a>.</p>
    </Topic>
    <Topic title="16. Parent support">
      <p>If a parent contacts KinderLearner for support, we may process:</p>
      <List items={['email address;', 'message contents;', 'attachments voluntarily provided; and', 'technical information reasonably necessary to investigate the request.']}/>
      <p>Please do not send children&apos;s full legal names, dates of birth, school schedules, health information, passwords, payment-card information or photographs unless specifically requested through an appropriate secure process.</p>
    </Topic>
    <Topic title="17. KinderLearner website">
      <p>KinderLearner&apos;s public marketing pages are intended for parents and other adults.</p><p>The website is separate from the child-facing app.</p>
      <p>Cloudflare processes technical request information necessary to deliver and protect the website.</p>
      <p><strong>The KinderLearner iPhone and iPad app does not use Google Analytics.</strong> Children&apos;s learning activity from the app is not sent to Google Analytics.</p>
      <p>Only the separate, adult-facing marketing website uses Google Analytics to understand website traffic and campaign referrals.</p>
      <p>Website analytics may process information such as:</p><List items={['browser and device information;', 'approximate network-derived location;', 'pages viewed;', 'referring website;', 'campaign parameters; and', 'identifiers or browser storage used for measurement.']}/>
      <p>You can manage cookies and other website storage through your browser settings. These website settings are separate from the app&apos;s parent-account and cloud-sync choices.</p>
      <p>The use of NYC Schools Ratings accounts, subscriptions and Family Calendar features is governed by the separate <a href="/privacy">NYC Schools Ratings Privacy Policy</a>.</p>
    </Topic>
    <Topic title="18. Children's participation and public features">
      <p>KinderLearner child activities do not include:</p><List items={['public child profiles;', 'public posting;', 'child-to-child messaging; or', 'a mechanism for children to contact strangers through the app.']}/>
      <p>Parent-account, cloud-sync, support, external-link and other adult-facing functions are intended for parents or guardians.</p>
      <p>If you believe children&apos;s personal information has been collected or maintained without appropriate parental authorization, please contact us at <Email/> so we can investigate and take appropriate action.</p>
    </Topic>
    <Topic title="19. Apple services">
      <p>Apple may separately process information relating to:</p><List items={['App Store downloads and purchases;', 'TestFlight;', 'Apple device backups;', 'Apple ID or family features; and', 'other Apple platform services.']}/>
      <p>Those services are governed by Apple&apos;s own terms and privacy practices.</p>
    </Topic>
    <Topic title="20. Changes to this policy">
      <p>We may update this Privacy Policy as KinderLearner changes.</p><p>The effective date at the top of the policy identifies the latest version.</p>
      <p>If we make a material change to how children&apos;s personal information is collected, used or disclosed in a manner requiring new parental notice or authorization, we will provide the required notice and obtain any additional authorization before applying that new practice to children&apos;s information where required by law.</p>
    </Topic>
    <Topic title="21. Contact us">
      <p>For privacy questions or requests:</p><Operator/>
      <p>Data and deletion requests: <a href="/kinderlearner/delete-data">KinderLearner Data &amp; Deletion Requests</a>.</p>
    </Topic>
  </>;
}
