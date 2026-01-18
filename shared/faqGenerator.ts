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

function getScoreDescription(score: number): string {
  const tier = getScoreTier(score);
  switch (tier) {
    case 'outstanding': return 'outstanding';
    case 'strong': return 'strong';
    case 'average': return 'average';
    case 'below_average': return 'below average';
  }
}

function formatPercent(value: number | null): string {
  if (value === null) return 'N/A';
  return `${value}%`;
}

function hasValidScore(score: number | null | undefined): boolean {
  return score !== null && score !== undefined && score >= 0;
}

function generateIsGoodSchoolAnswer(school: SchoolWithOverallScore): string {
  const overallScore = school.overall_score;
  
  let intro = '';
  
  if (!hasValidScore(overallScore) || overallScore < 0) {
    intro = `${school.name} does not have sufficient data available to calculate an overall score at this time. This may be due to the school being new, recently reorganized, or having incomplete assessment data.`;
  } else {
    const tier = getScoreTier(overallScore);
    
    switch (tier) {
      case 'outstanding':
        intro = `${school.name} is an excellent school with an overall score of ${overallScore}/100, placing it among the top performers in NYC.`;
        break;
      case 'strong':
        intro = `${school.name} is a strong school with an overall score of ${overallScore}/100, performing above average compared to other NYC schools.`;
        break;
      case 'average':
        intro = `${school.name} has an overall score of ${overallScore}/100, representing average performance among NYC schools.`;
        break;
      case 'below_average':
        intro = `${school.name} has an overall score of ${overallScore}/100. While there's room for improvement, the school may offer unique programs or community benefits.`;
        break;
    }
  }

  const details: string[] = [];
  
  if (school.ela_proficiency !== null && school.math_proficiency !== null) {
    const avgProficiency = Math.round((school.ela_proficiency + school.math_proficiency) / 2);
    if (avgProficiency >= 60) {
      details.push(`Academic performance is strong with ${school.ela_proficiency}% ELA and ${school.math_proficiency}% Math proficiency`);
    } else if (avgProficiency >= 40) {
      details.push(`Academic performance shows ${school.ela_proficiency}% ELA and ${school.math_proficiency}% Math proficiency`);
    } else {
      details.push(`The school is working to improve academics with ${school.ela_proficiency}% ELA and ${school.math_proficiency}% Math proficiency`);
    }
  }

  if (school.climate_score !== null && school.climate_score >= 80) {
    details.push(`The school environment is rated ${getScoreDescription(school.climate_score)} with a climate score of ${school.climate_score}/100`);
  }

  if (school.guardian_satisfaction !== null && school.guardian_satisfaction >= 80) {
    details.push(`Parent satisfaction is high at ${school.guardian_satisfaction}%`);
  }

  return intro + (details.length > 0 ? ' ' + details.join('. ') + '.' : '');
}

function generateStrengthsWeaknessesAnswer(school: SchoolWithOverallScore): string {
  const strengths: string[] = [];
  const areas_to_improve: string[] = [];

  if (school.ela_proficiency !== null) {
    if (school.ela_proficiency >= 60) {
      strengths.push(`Strong ELA proficiency (${school.ela_proficiency}%)`);
    } else if (school.ela_proficiency < 40) {
      areas_to_improve.push(`ELA proficiency (${school.ela_proficiency}%)`);
    }
  }

  if (school.math_proficiency !== null) {
    if (school.math_proficiency >= 60) {
      strengths.push(`Strong Math proficiency (${school.math_proficiency}%)`);
    } else if (school.math_proficiency < 40) {
      areas_to_improve.push(`Math proficiency (${school.math_proficiency}%)`);
    }
  }

  if (school.climate_score !== null) {
    if (school.climate_score >= 85) {
      strengths.push(`Excellent school climate (${school.climate_score}/100)`);
    } else if (school.climate_score < 70) {
      areas_to_improve.push(`School climate (${school.climate_score}/100)`);
    }
  }

  if (school.progress_score !== null) {
    if (school.progress_score >= 85) {
      strengths.push(`Strong student progress and growth (${school.progress_score}/100)`);
    } else if (school.progress_score < 70) {
      areas_to_improve.push(`Student progress metrics (${school.progress_score}/100)`);
    }
  }

  if (school.guardian_satisfaction !== null && school.guardian_satisfaction >= 85) {
    strengths.push(`High parent satisfaction (${school.guardian_satisfaction}%)`);
  }

  if (school.student_safety !== null && school.student_safety >= 85) {
    strengths.push(`Students report feeling safe (${school.student_safety}%)`);
  } else if (school.student_safety !== null && school.student_safety < 70) {
    areas_to_improve.push(`Student safety perceptions (${school.student_safety}%)`);
  }

  if (school.student_teacher_ratio !== null && school.student_teacher_ratio <= 15) {
    strengths.push(`Small class sizes with ${school.student_teacher_ratio}:1 student-teacher ratio`);
  } else if (school.student_teacher_ratio !== null && school.student_teacher_ratio > 25) {
    areas_to_improve.push(`Large class sizes (${school.student_teacher_ratio}:1 ratio)`);
  }

  if (school.has_gifted_talented) {
    const gtType = school.gt_program_type === 'citywide' ? 'Citywide' : 'District';
    strengths.push(`Offers ${gtType} Gifted & Talented program`);
  }

  if (school.has_dual_language) {
    const languages = school.dual_language_languages?.join(', ') || 'multiple languages';
    strengths.push(`Dual Language program (${languages})`);
  }

  if (school.has_3k || school.has_prek) {
    const programs = [school.has_3k ? '3-K' : null, school.has_prek ? 'Pre-K' : null].filter(Boolean).join(' and ');
    strengths.push(`Early childhood programs (${programs})`);
  }

  if (school.attendance_rate !== null && school.attendance_rate >= 95) {
    strengths.push(`High attendance rate (${school.attendance_rate}%)`);
  }

  let answer = `**Strengths:** `;
  if (strengths.length > 0) {
    answer += strengths.join('; ') + '.';
  } else {
    answer += 'Data for specific strengths is limited.';
  }

  answer += ` **Areas for growth:** `;
  if (areas_to_improve.length > 0) {
    answer += areas_to_improve.join('; ') + '.';
  } else {
    answer += 'No significant areas of concern identified.';
  }

  return answer;
}

function generateBestForAnswer(school: SchoolWithOverallScore): string {
  const suitableFor: string[] = [];
  const considerations: string[] = [];

  if (school.ell_percent !== null && school.ell_percent >= 15) {
    suitableFor.push(`**English Language Learners (ELL):** With ${school.ell_percent}% ELL students, the school has experience supporting multilingual learners`);
  }

  if (school.iep_percent !== null && school.iep_percent >= 20) {
    suitableFor.push(`**Students with IEPs:** ${school.iep_percent}% of students have Individualized Education Programs, indicating robust special education services`);
  }

  if (school.has_gifted_talented) {
    const gtType = school.gt_program_type === 'citywide' ? 'Citywide' : 'District';
    suitableFor.push(`**Advanced learners:** The school offers a ${gtType} Gifted & Talented program for academically advanced students`);
  }

  if (school.has_dual_language) {
    const languages = school.dual_language_languages?.join(' and ') || 'multiple languages';
    suitableFor.push(`**Bilingual families:** Dual Language program available in ${languages}`);
  }

  if (school.ela_proficiency !== null && school.math_proficiency !== null) {
    const avgProficiency = (school.ela_proficiency + school.math_proficiency) / 2;
    if (avgProficiency >= 70) {
      suitableFor.push(`**Academically-focused students:** Strong test scores indicate rigorous academics`);
    }
  }

  if (school.climate_score !== null && school.climate_score >= 85) {
    suitableFor.push(`**Families prioritizing school culture:** The school has an excellent climate score (${school.climate_score}/100)`);
  }

  if (school.student_safety !== null && school.student_safety >= 85) {
    suitableFor.push(`**Safety-conscious families:** Students report feeling very safe (${school.student_safety}%)`);
  }

  if (school.has_3k || school.has_prek) {
    const programs = [school.has_3k ? '3-K' : null, school.has_prek ? 'Pre-K' : null].filter(Boolean).join(' and ');
    suitableFor.push(`**Families with young children:** ${programs} programs available for early enrollment`);
  }

  if (school.economic_need_index !== null && school.economic_need_index >= 80) {
    considerations.push(`The school serves a high-need community (Economic Need Index: ${school.economic_need_index}%), which may qualify for additional resources and support programs`);
  }

  let answer = '';
  if (suitableFor.length > 0) {
    answer = `${school.name} may be particularly well-suited for:\n\n${suitableFor.join('\n\n')}`;
  } else {
    answer = `${school.name} serves a general student population. `;
    
    if (school.enrollment) {
      answer += `With ${school.enrollment.toLocaleString()} students`;
      if (school.grade_band) {
        answer += ` in grades ${school.grade_band}`;
      }
      answer += ', the school offers a standard educational experience. ';
    }
  }

  if (considerations.length > 0) {
    answer += '\n\n**Additional context:** ' + considerations.join('. ');
  }

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
