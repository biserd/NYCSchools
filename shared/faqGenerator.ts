import type { SchoolWithOverallScore } from './schema';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SchoolFAQ {
  faqs: FAQItem[];
  lastUpdated: string;
}

function getScoreTier(score: number): 'outstanding' | 'strong' | 'average' | 'below_average' {
  if (score >= 90) return 'outstanding';
  if (score >= 80) return 'strong';
  if (score >= 70) return 'average';
  return 'below_average';
}

function hasValidScore(score: number | null | undefined): boolean {
  return score !== null && score !== undefined && score >= 0;
}

function generateIsGoodSchoolAnswer(school: SchoolWithOverallScore): string {
  const overallScore = school.overall_score;
  
  let intro = '';
  
  if (!hasValidScore(overallScore) || overallScore < 0) {
    intro = `${school.name} does not have sufficient data available to calculate an overall rating at this time. This may be due to the school being new, recently reorganized, or having incomplete assessment data.`;
  } else {
    const tier = getScoreTier(overallScore);
    
    switch (tier) {
      case 'outstanding':
        intro = `${school.name} is an excellent school, placing it among the top performers in NYC based on academics, school climate, and student progress.`;
        break;
      case 'strong':
        intro = `${school.name} is a strong school, performing above average compared to other NYC schools across key metrics.`;
        break;
      case 'average':
        intro = `${school.name} shows average performance among NYC schools, with room for growth in some areas.`;
        break;
      case 'below_average':
        intro = `${school.name} is working to improve across key metrics. The school may offer unique programs or community benefits worth exploring.`;
        break;
    }
  }

  const details: string[] = [];
  
  if (school.ela_proficiency !== null && school.math_proficiency !== null) {
    const avgProficiency = Math.round((school.ela_proficiency + school.math_proficiency) / 2);
    if (avgProficiency >= 60) {
      details.push(`Academic performance is strong in both reading and math`);
    } else if (avgProficiency >= 40) {
      details.push(`Academic performance is developing with ongoing improvement efforts`);
    }
  }

  if (school.climate_score !== null && school.climate_score >= 80) {
    details.push(`The school environment receives positive ratings from the school community`);
  }

  if (school.guardian_satisfaction !== null && school.guardian_satisfaction >= 80) {
    details.push(`Parent satisfaction is high`);
  }

  let conclusion = ' View the full school profile for detailed scores and metrics.';

  return intro + (details.length > 0 ? ' ' + details.join('. ') + '.' : '') + conclusion;
}

function generateStrengthsWeaknessesAnswer(school: SchoolWithOverallScore): string {
  const strengths: string[] = [];
  const areas_to_improve: string[] = [];

  if (school.ela_proficiency !== null && school.ela_proficiency >= 60) {
    strengths.push(`Strong reading and writing instruction`);
  } else if (school.ela_proficiency !== null && school.ela_proficiency < 40) {
    areas_to_improve.push(`Reading and writing outcomes`);
  }

  if (school.math_proficiency !== null && school.math_proficiency >= 60) {
    strengths.push(`Strong math instruction`);
  } else if (school.math_proficiency !== null && school.math_proficiency < 40) {
    areas_to_improve.push(`Math outcomes`);
  }

  if (school.climate_score !== null && school.climate_score >= 85) {
    strengths.push(`Excellent school climate and culture`);
  } else if (school.climate_score !== null && school.climate_score < 70) {
    areas_to_improve.push(`School climate`);
  }

  if (school.progress_score !== null && school.progress_score >= 85) {
    strengths.push(`Strong student growth and progress`);
  } else if (school.progress_score !== null && school.progress_score < 70) {
    areas_to_improve.push(`Student progress metrics`);
  }

  if (school.guardian_satisfaction !== null && school.guardian_satisfaction >= 85) {
    strengths.push(`High parent satisfaction`);
  }

  if (school.student_safety !== null && school.student_safety >= 85) {
    strengths.push(`Students report feeling safe`);
  } else if (school.student_safety !== null && school.student_safety < 70) {
    areas_to_improve.push(`Student safety perceptions`);
  }

  if (school.student_teacher_ratio !== null && school.student_teacher_ratio <= 15) {
    strengths.push(`Smaller class sizes`);
  } else if (school.student_teacher_ratio !== null && school.student_teacher_ratio > 25) {
    areas_to_improve.push(`Larger class sizes`);
  }

  if (school.has_gifted_talented) {
    const gtType = school.gt_program_type === 'citywide' ? 'Citywide' : 'District';
    strengths.push(`${gtType} Gifted & Talented program`);
  }

  if (school.has_dual_language) {
    strengths.push(`Dual Language program`);
  }

  if (school.has_3k || school.has_prek) {
    const programs = [school.has_3k ? '3-K' : null, school.has_prek ? 'Pre-K' : null].filter(Boolean).join(' and ');
    strengths.push(`Early childhood programs (${programs})`);
  }

  if (school.attendance_rate !== null && school.attendance_rate >= 95) {
    strengths.push(`High student attendance`);
  }

  let answer = `**Strengths:** `;
  if (strengths.length > 0) {
    answer += strengths.join('; ') + '.';
  } else {
    answer += 'View the full profile for detailed information.';
  }

  answer += ` **Areas for growth:** `;
  if (areas_to_improve.length > 0) {
    answer += areas_to_improve.join('; ') + '.';
  } else {
    answer += 'No significant areas of concern identified.';
  }

  answer += ' See the full school profile for specific metrics and comparisons.';

  return answer;
}

function generateBestForAnswer(school: SchoolWithOverallScore): string {
  const suitableFor: string[] = [];

  if (school.ell_percent !== null && school.ell_percent >= 15) {
    suitableFor.push(`**English Language Learners (ELL):** The school has experience supporting multilingual learners`);
  }

  if (school.iep_percent !== null && school.iep_percent >= 20) {
    suitableFor.push(`**Students with IEPs:** The school has robust special education services`);
  }

  if (school.has_gifted_talented) {
    const gtType = school.gt_program_type === 'citywide' ? 'Citywide' : 'District';
    suitableFor.push(`**Advanced learners:** The school offers a ${gtType} Gifted & Talented program`);
  }

  if (school.has_dual_language) {
    const languages = school.dual_language_languages?.join(' and ') || 'multiple languages';
    suitableFor.push(`**Bilingual families:** Dual Language program available in ${languages}`);
  }

  if (school.ela_proficiency !== null && school.math_proficiency !== null) {
    const avgProficiency = (school.ela_proficiency + school.math_proficiency) / 2;
    if (avgProficiency >= 70) {
      suitableFor.push(`**Academically-focused students:** Strong academics indicate rigorous instruction`);
    }
  }

  if (school.climate_score !== null && school.climate_score >= 85) {
    suitableFor.push(`**Families prioritizing school culture:** The school has an excellent climate rating`);
  }

  if (school.student_safety !== null && school.student_safety >= 85) {
    suitableFor.push(`**Safety-conscious families:** Students report feeling very safe`);
  }

  if (school.has_3k || school.has_prek) {
    const programs = [school.has_3k ? '3-K' : null, school.has_prek ? 'Pre-K' : null].filter(Boolean).join(' and ');
    suitableFor.push(`**Families with young children:** ${programs} programs available for early enrollment`);
  }

  if (school.economic_need_index !== null && school.economic_need_index >= 80) {
    suitableFor.push(`**Community-focused families:** The school serves a high-need community with additional resources and support programs`);
  }

  let answer = '';
  if (suitableFor.length > 0) {
    answer = `${school.name} may be particularly well-suited for:\n\n${suitableFor.join('\n\n')}`;
  } else {
    answer = `${school.name} serves a general student population`;
    if (school.grade_band) {
      answer += ` in grades ${school.grade_band}`;
    }
    answer += ', offering a standard educational experience.';
  }

  answer += '\n\nExplore the full school profile for detailed demographics, test scores, and program information.';

  return answer;
}

export function generateSchoolFAQ(school: SchoolWithOverallScore): SchoolFAQ {
  const faqs: FAQItem[] = [
    {
      question: `Is ${school.name} a good school?`,
      answer: generateIsGoodSchoolAnswer(school),
    },
    {
      question: `What are ${school.name}'s strengths and weaknesses?`,
      answer: generateStrengthsWeaknessesAnswer(school),
    },
    {
      question: `Who is ${school.name} best for?`,
      answer: generateBestForAnswer(school),
    },
  ];

  return {
    faqs,
    lastUpdated: new Date().toISOString().split('T')[0],
  };
}

export function generateFAQStructuredData(school: SchoolWithOverallScore, faq: SchoolFAQ): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faq.faqs.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer.replace(/\*\*/g, '').replace(/\n/g, ' '),
      }
    }))
  };
}
