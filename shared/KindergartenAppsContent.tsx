import React, { type ReactNode } from 'react';
import {
  KINDERGARTEN_APP_PICKS,
  KINDERLEARNER_APP_STORE,
  KINDERLEARNER_MATH_SAMPLE,
  KINDERLEARNER_SOUNDS_SAMPLE,
} from './kindergarten-apps';

function Source({ href, children, className = 'font-medium underline underline-offset-4' }: {href: string; children: ReactNode; className?: string}) {
  const host = new URL(href, 'https://nycschoolsratings.com').hostname.replace(/^www\./, '');
  const internal = host === 'nycschoolsratings.com';
  const rel = internal ? undefined : host === 'kinderlearner.com' ? 'noopener noreferrer' : 'nofollow noopener noreferrer';
  return <a href={href} target={internal ? undefined : '_blank'} rel={rel} className={className}>{children}</a>;
}

export function KindergartenAppsContent() {
  return (
    <article className="prose prose-lg dark:prose-invert max-w-none" aria-label="Kindergarten learning app comparison" data-testid="kindergarten-apps-content">
      <p className="lead text-xl text-muted-foreground">
        <strong>KinderLearner</strong> gives kindergarteners a playful way to practice letter sounds, counting, and early math.
        After a short session, parents can see what their child practiced and get a simple activity to try together away from the screen.
      </p>
      <h2 id="compare-kindergarten-learning-apps">Kindergarten learning apps at a glance</h2>
      <p id="kindergarten-apps-table-note" className="text-sm text-muted-foreground">Prices and offers can change. On a small screen, swipe or scroll across to see all four columns.</p>
      <div role="region" aria-label="Compare seven kindergarten apps" aria-describedby="kindergarten-apps-table-note" tabIndex={0} className="not-prose my-6 overflow-x-auto rounded-lg border focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
        <table className="w-full min-w-[670px] text-left text-sm leading-relaxed">
          <caption className="sr-only">Kindergarten learning apps by best use, supported devices, and U.S. price</caption>
          <thead className="bg-muted text-foreground">
            <tr>{['App', 'Best for', 'Devices', 'Free and paid access'].map(label => <th key={label} scope="col" className="p-3 align-top font-semibold">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y">
            {KINDERGARTEN_APP_PICKS.map((app, index) => <tr key={app.name} className={index === 0 ? 'bg-primary/5' : 'bg-background'}>
              <th scope="row" className="w-[20%] p-3 align-top font-semibold"><a href={`#${app.id}`} className="text-primary underline underline-offset-4">{index + 1}. {app.name}</a></th>
              <td className="w-[21%] p-3 align-top">{app.bestFor}</td>
              <td className="w-[16%] p-3 align-top">{app.devices}</td>
              <td className="p-3 align-top"><p>{app.price}</p>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-primary">{app.sources.map(([label, url]) => <Source key={url} href={url}>{label}</Source>)}</div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>

      <h2 id="kinderlearner">1. KinderLearner: Best for knowing what to practice next</h2>
      <p>KinderLearner is designed for families who want to turn a short phonics or math session into something they can practice together at home.</p>
      <div className="not-prose my-6 grid gap-5 rounded-xl border border-primary/20 bg-primary/5 p-5 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center">
        <div className="space-y-4 leading-relaxed">
          <p>Children can practice letter sounds, count objects, or compare numbers in short activities. Parent Mode shows what they practiced and suggests a related activity away from the screen. <Source href="https://kinderlearner.com/ios/">See how it works</Source>.</p>
          <p><strong>Try it tonight:</strong> If your child can count five objects but hesitates when one is taken away, put five spoons on the table, hide one, and ask how many they can see. No worksheet needed.</p>
        </div>
        <figure className="mx-auto max-w-40 text-center">
          <img src="https://kinderlearner.com/product/iphone-number-explorers.png" width={1320} height={2868} alt="KinderLearner on iPhone asks which number is greater, 35 or 53, with tappable answers." loading="lazy" decoding="async" className="h-auto w-full rounded-xl border bg-background" />
          <figcaption className="mt-2 text-xs text-muted-foreground">Real iPhone screen with demo content.</figcaption>
        </figure>
      </div>
      <p><strong>The trade-off:</strong> KinderLearner focuses on early practice, not a full elementary curriculum. The free account has a daily activity limit, and the native app requires iOS or iPadOS 17 or later. For a broader free library, choose Khan Academy Kids. <Source href={KINDERLEARNER_APP_STORE}>Check device compatibility</Source>.</p>
      <div className="not-prose my-6 rounded-lg border bg-background p-4">
        <p className="mb-3 text-sm text-muted-foreground">Try a sample in your browser. No account needed.</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Source href={KINDERLEARNER_MATH_SAMPLE} className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Try a free math game</Source>
          <Source href={KINDERLEARNER_SOUNDS_SAMPLE} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-4">Try beginning sounds</Source>
        </div>
      </div>
      <p>Want to keep going on a tablet? <Source href={KINDERLEARNER_APP_STORE}>Get KinderLearner on iPhone or iPad</Source>.</p>

      <h2 id="when-to-choose-another-app">When another app is the better choice</h2>
      <p>Each app is strongest at a different job. Here’s what your child can actually practice, where to start, and when one of the other picks makes more sense.</p>

      <h3 id="khan-academy-kids">2. Khan Academy Kids: Best all-around free app</h3>
      <p>Choose this if you want reading and math in one place without a subscription. Khan Academy Kids covers ages 2–8, with stories, early writing, math games, and activities about feelings and relationships. Families get the full app library without ads or in-app purchases. <Source href="https://www.khanacademy.org/kids">Explore the library</Source>.</p>
      <p><strong>Try first:</strong> Pick one counting activity and follow it with one story. <strong>The trade-off:</strong> It gives you more to explore than KinderLearner. If you’d rather start with a short practice session and one suggestion for later, KinderLearner is the more focused choice.</p>

      <h3 id="duolingo-abc">3. Duolingo ABC: Best for free, short phonics lessons</h3>
      <p>This is the separate reading app, not the Duolingo language app. Its lessons cover letter sounds, decoding, handwriting, sight words, and vocabulary. The publisher also includes short illustrated stories so children can meet the words they practice in context. <Source href="https://abc.duolingo.com/">See the reading skills</Source>.</p>
      <p><strong>Try first:</strong> After a letter-sound lesson, say the sounds in <em>sat</em> slowly and see if your child can put them together. <strong>The trade-off:</strong> It’s a better fit for phonics alone. Choose KinderLearner or Khan Academy Kids if you also want counting and number practice in the same app.</p>

      <h3 id="starfall">4. Starfall: Best for picking a reading activity in your browser</h3>
      <p>Starfall pairs sound and word games with short books. Its free Learn to Read section lets you choose a sound pattern, while the wider site also offers math and songs. The paid Home Membership adds more activities; you don’t need it to try the free reading sequence. <Source href="https://www.starfall.com/h/learn-to-read/">Open Learn to Read</Source>.</p>
      <p><strong>Try first:</strong> Choose the <em>-at</em> activity and then read <em>Zac the Rat</em> together. <strong>The trade-off:</strong> This is a good fit when you already know which sound or book to pick. If you’re unsure where to start with both letters and numbers, KinderLearner’s starting-point activity gives you a more guided entry.</p>

      <h3 id="abcmouse">5. ABCmouse: Best for a structured, multi-subject program</h3>
      <p>ABCmouse covers reading and math alongside topics such as science and art. Its kindergarten materials include word families, addition and subtraction, and topics like weather and seasons. Basic Access gives families a rotating selection; Premium unlocks the full library and personalized reading and math paths. <Source href="https://www.abcmouse.com/learn/">See the kindergarten curriculum</Source>.</p>
      <p><strong>Try first:</strong> Choose <strong>Basic Access</strong> rather than the Premium trial if you want to explore without starting a subscription trial. <strong>The trade-off:</strong> ABCmouse offers more subjects. KinderLearner is a better fit if you mainly want a quick way to practice phonics and math at home. <Source href="https://support.abcmouse.com/hc/en-us/articles/34386182204311-ABCmouse-Free-Access-Here-s-What-You-Need-to-Know">How Basic Access works</Source>.</p>

      <h3 id="splashlearn">6. SplashLearn: Best for grade-level math practice and worksheets</h3>
      <p>Start here if you know the skill you want to work on. SplashLearn organizes games and worksheets by grade and topic, including counting, comparing groups, and other early number skills. It also covers English and continues through fifth grade. <Source href="https://www.splashlearn.com/kindergarteners">Browse the kindergarten resources</Source>.</p>
      <p><strong>Try first:</strong> Start with a <Source href="https://www.splashlearn.com/math/number-sense-games-for-kindergarteners">number-sense game</Source> on counting or comparing groups. If your teacher already assigns SplashLearn, try that free practice before buying home access. <strong>The trade-off:</strong> SplashLearn gives you more materials for a particular grade or topic; KinderLearner gives you a shorter routine with an idea to try off-screen.</p>

      <h3 id="teach-your-monster-to-read">7. Teach Your Monster to Read: Best for phonics in a story-driven game</h3>
      <p>Children guide a monster through a reading adventure that starts with letter sounds and moves into putting sounds together, separating words into sounds, and reading short sentences. Unlike Starfall, where you can choose a specific book or sound, the monster game gives children a story to follow across stages. <Source href="https://www.teachyourmonster.org/teach-your-monster-to-read/">See the reading stages</Source>.</p>
      <p><strong>Try first:</strong> Open the free computer version and choose <em>First Steps</em> if your child is just learning letter sounds. <strong>The trade-off:</strong> This game is for reading, not math. Try the web version before buying the mobile app, since the publisher has announced a change to how new mobile users pay.</p>

      <h2 id="how-to-choose-a-kindergarten-app">How to tell if an app is worth keeping</h2>
      <p>Pick one skill, not seven apps. For beginning sounds, play a round together, then see if your child can find something in the room that starts with the same sound. For counting, ask them to hand you four socks. Notice what they can do on their own and where a little help makes a difference. That tells you more about what to try tomorrow than a badge or a streak.</p>
      <p>Planning for school, too? See our <Source href="/guides/nyc-kindergarten-admissions-2027">Fall 2027 NYC kindergarten admissions guide</Source>.</p>
    </article>
  );
}
