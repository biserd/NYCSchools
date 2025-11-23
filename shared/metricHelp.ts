/**
 * Metric Help Configuration
 * Defines tooltip content, icons, and visual cues for all school metrics
 */

export const METRIC_TOOLTIPS = {
  // Overall Score
  overallScore: {
    label: "Overall Score",
    tooltip: "Overall score combines test proficiency (average of ELA and Math - 40%), school climate (30%), and student progress (30%). Scores 80+ are Outstanding, 60-79 are Strong, 40-59 are Average, and below 40 need improvement.",
    color: "Based on score: Green (80+), Yellow (60-79), Red (<60)",
  },
  
  // Component Scores
  academics: {
    label: "Academics",
    tooltip: "Measures student proficiency in English Language Arts (ELA) and Math based on NYS standardized test results. Higher scores indicate more students meeting state standards.",
  },
  
  climate: {
    label: "School Climate",
    tooltip: "Reflects school safety, family engagement, and student support. Based on feedback from students, teachers, and parents about the school environment.",
  },
  
  progress: {
    label: "Progress",
    tooltip: "Tracks student growth and improvement over time. Shows how effectively the school helps students advance academically.",
  },
  
  // Academic Proficiency
  elaProficiency: {
    label: "ELA Proficient",
    tooltip: "Percentage of students who met or exceeded New York State standards on the English Language Arts exam. This measures reading, writing, and comprehension skills.",
  },
  
  mathProficiency: {
    label: "Math Proficient",
    tooltip: "Percentage of students who met or exceeded New York State standards on the Math exam. This measures mathematical reasoning and problem-solving abilities.",
  },
  
  // School Details
  enrollment: {
    label: "Enrollment",
    tooltip: "Total number of students currently enrolled in the school. Larger schools may offer more programs, while smaller schools may provide more individual attention.",
  },
  
  studentTeacherRatio: {
    label: "Student-Teacher Ratio",
    tooltip: "Average number of students per teacher. Lower ratios often mean more individualized attention for each student.",
  },
  
  // Survey Data - Student
  studentSafety: {
    label: "Safety",
    tooltip: "Percentage of students who report feeling safe at school. Based on NYC School Survey responses about physical and emotional safety.",
  },
  
  studentTeacherTrust: {
    label: "Teacher Trust",
    tooltip: "Percentage of students who report trusting and feeling supported by their teachers. Based on NYC School Survey responses.",
  },
  
  studentEngagement: {
    label: "Engagement",
    tooltip: "Percentage of students who report being engaged and interested in their schoolwork. Based on NYC School Survey responses about academic involvement.",
  },
  
  // Survey Data - Teacher
  teacherQuality: {
    label: "Instruction Quality",
    tooltip: "Percentage of teachers who rate the quality of instruction highly. Based on NYC School Survey responses about teaching practices and professional development.",
  },
  
  teacherCollaboration: {
    label: "Collaboration",
    tooltip: "Percentage of teachers who report strong collaboration with colleagues. Based on NYC School Survey responses about teamwork and professional learning communities.",
  },
  
  teacherLeadership: {
    label: "Leadership",
    tooltip: "Percentage of teachers who rate school leadership positively. Based on NYC School Survey responses about principal effectiveness and school management.",
  },
  
  // Survey Data - Guardian
  guardianSatisfaction: {
    label: "Satisfaction",
    tooltip: "Percentage of parents/guardians who are satisfied with their child's school. Based on NYC School Survey responses about overall school quality.",
  },
  
  guardianCommunication: {
    label: "Communication",
    tooltip: "Percentage of parents/guardians who report effective communication with the school. Based on NYC School Survey responses about teacher outreach and school updates.",
  },
  
  guardianSchoolTrust: {
    label: "School Trust",
    tooltip: "Percentage of parents/guardians who trust the school to educate their children well. Based on NYC School Survey responses about confidence in school quality.",
  },
  
  // Color Legend
  colorLegend: {
    green: {
      label: "Outstanding",
      description: "Score of 80 or higher - Exceeds expectations",
    },
    yellow: {
      label: "Strong",
      description: "Score of 60-79 - Meets expectations",
    },
    red: {
      label: "Needs Improvement",
      description: "Score below 60 - Below expectations",
    },
  },
  
  // Data Source
  dataSource: {
    survey: "NYC School Survey",
    description: "Data sourced from NYC Department of Education School Survey and public records. Survey scores reflect feedback from students, teachers, and parents collected annually.",
  },
} as const;

export type MetricKey = keyof typeof METRIC_TOOLTIPS;
