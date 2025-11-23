/**
 * Metric Help Configuration
 * Defines tooltip content, icons, and visual cues for all school metrics
 */

export const METRIC_TOOLTIPS = {
  // Overall Score
  overallScore: {
    label: "Overall Score",
    tooltip: "Overall score combines test proficiency (average of ELA and Math - 40%), school climate (30%), and student progress (30%). Scores 90+ are Outstanding, 80-89 are Strong, 70-79 are Average, and below 70 need improvement.",
    color: "Based on score: Green (90+), Yellow (80-89), Amber (70-79), Red (<70)",
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
  
  // NYC DOE Snapshot Data - Demographics & Economics
  economicNeedIndex: {
    label: "Economic Need Index",
    tooltip: "Percentage of students facing economic hardship (eligible for free/reduced lunch, temporary housing, or HRA-eligible). Higher percentages indicate greater economic challenges. This metric helps understand the school's student population and resource needs.",
  },
  
  ellPercent: {
    label: "English Language Learners",
    tooltip: "Percentage of students who are English Language Learners (ELL). These students are learning English while keeping up with grade-level coursework. Schools with higher ELL populations often provide additional language support services.",
  },
  
  iepPercent: {
    label: "Students with IEPs",
    tooltip: "Percentage of students with Individualized Education Programs (IEP). These students receive special education services tailored to their unique learning needs. Schools provide specialized instruction and support for IEP students.",
  },
  
  // Attendance Metrics
  attendanceRate: {
    label: "Student Attendance",
    tooltip: "Percentage of school days students attend on average. Higher attendance rates (95%+) correlate with better academic outcomes. Chronic absenteeism (below 90%) can significantly impact student learning.",
  },
  
  teacherAttendanceRate: {
    label: "Teacher Attendance",
    tooltip: "Percentage of school days teachers attend on average. Higher teacher attendance ensures consistency in instruction and classroom management. Schools with 95%+ teacher attendance provide more stable learning environments.",
  },
  
  // NYC DOE Quality Ratings (4-bar system)
  qualityRatingInstruction: {
    label: "Instruction Rating",
    tooltip: "NYC Department of Education's overall rating for quality of instruction and academic rigor. Ratings range from 'Excellent' (highest) to 'Needs Improvement' (lowest). Based on classroom observations, student work, and teacher practice.",
  },
  
  qualityRatingSafety: {
    label: "Safety & Respect Rating",
    tooltip: "NYC Department of Education's overall rating for school safety and respectful environment. Ratings range from 'Excellent' to 'Needs Improvement'. Based on safety protocols, student behavior data, and school climate surveys.",
  },
  
  qualityRatingFamily: {
    label: "Family Engagement Rating",
    tooltip: "NYC Department of Education's overall rating for family-school partnerships and communication. Ratings range from 'Excellent' to 'Needs Improvement'. Based on parent involvement, communication quality, and family engagement activities.",
  },
  
  // Academic Readiness
  nextLevelReadiness: {
    label: "Next Grade Readiness",
    tooltip: "Percentage of students who are academically prepared for the next grade level. For elementary schools, this often measures 5th graders' readiness for middle school. Higher percentages indicate stronger grade-to-grade transitions.",
  },
  
  // Staff Experience
  principalExperienceYears: {
    label: "Principal Tenure",
    tooltip: "Number of years the current principal has led this school. Longer tenure often indicates stability and continuity in school leadership. Research shows principals need 3-5 years to implement meaningful change.",
  },
  
  teacherExperiencePercent: {
    label: "Experienced Teachers",
    tooltip: "Percentage of teachers with 3 or more years of teaching experience. Higher percentages indicate a more experienced teaching staff. Research shows teacher effectiveness increases significantly after the first few years.",
  },
  
  // Admissions & Accountability
  admissionMethod: {
    label: "Admission Method",
    tooltip: "How students are admitted to this school. 'Zoned' schools serve neighborhood students by address. 'Screened' schools use academic criteria. 'Choice' schools use lottery or other methods. Understanding admission type helps with enrollment planning.",
  },
  
  accountabilityStatus: {
    label: "Accountability Status",
    tooltip: "NYC Department of Education designation indicating school performance level and support needs. Schools may be designated for additional support, targeted improvement, or comprehensive improvement based on multiple academic and climate indicators.",
  },
  
  middleSchoolsPipeline: {
    label: "Middle School Pipeline",
    tooltip: "Top middle schools where this elementary school's students typically enroll. Shows common pathways and helps families plan for middle school transitions. Based on historical enrollment patterns from this school.",
  },
  
  // Color Legend
  colorLegend: {
    green: {
      label: "Outstanding",
      description: "Score of 90 or higher - Exceeds expectations",
    },
    yellow: {
      label: "Strong",
      description: "Score of 80-89 - Strong performance",
    },
    amber: {
      label: "Average",
      description: "Score of 70-79 - Meets expectations",
    },
    red: {
      label: "Needs Improvement",
      description: "Score below 70 - Below expectations",
    },
  },
  
  // Data Source
  dataSource: {
    survey: "NYC School Survey",
    description: "Data sourced from NYC Department of Education School Survey and public records. Survey scores reflect feedback from students, teachers, and parents collected annually.",
  },
} as const;

export type MetricKey = keyof typeof METRIC_TOOLTIPS;
