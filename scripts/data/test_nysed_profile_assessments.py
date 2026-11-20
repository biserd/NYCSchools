import unittest
from refresh_nysed_assessments import measures, resolve


def metric(eligible="", tested="", proficient="", percent=""):
    return dict(TOTAL_COUNT=eligible,NUM_TESTED=tested,NUM_PROF=proficient,PER_PROF=percent)


class AssessmentTests(unittest.TestCase):
    def test_zero_and_suppression(self):
        self.assertEqual(measures(metric("20","16","0","0")), (20,16,0,0.0,"count"))
        self.assertEqual(measures(metric("20","0","s","s")), (20,0,None,None,"zero_tested"))
        self.assertEqual(measures(metric("20","5","s","40")), (20,5,None,None,"suppressed"))
        self.assertEqual(measures(metric("20","5","","40")), (20,5,None,40.0,"published_percent"))
        self.assertEqual(measures(metric("20","5","","")), (20,5,None,None,"missing"))

    def test_invalid_counts_fail(self):
        for row in (metric("10","11","0"),metric("10","9","10"),metric("10","0","1"),metric("10","8","-3")):
            with self.assertRaises(ValueError):
                measures(row)

    def test_verified_identifier_not_names(self):
        beds, inst, dbn = "330100860001","800000000001","84K111"
        row={"ENTITY_CD":beds,"INSTITUTION_ID":inst,"ENTITY_NAME":"Totally different display name"}
        official={"dbn":dbn,"managed":"charter","address":"101 East 14th Street"}
        directory={beds:[official]}
        roster={dbn:{"name":"Canonical name","address":"101 E 14 ST, Brooklyn"}}
        args=dict(directory=directory,roster=roster,id_beds={inst:{beds}},beds_ids={beds:{inst}},dbn_beds={dbn:{beds}})
        self.assertEqual(resolve(row,**args),(dbn,None))
        self.assertEqual(resolve(row,**(args|{"roster":{}})),(None,"no_existing_profile"))
        self.assertEqual(resolve(row,**(args|{"directory":{beds:[official,official|{"dbn":"84K112"}]}})),(None,"ambiguous_lcgms_beds"))
        self.assertEqual(resolve(row,**(args|{"id_beds":{inst:{beds,"330100860002"}}})),(None,"institution_beds_changed"))
        self.assertEqual(resolve(row,**(args|{"roster":{dbn:{"address":"101 WEST 14 ST"}}})),(None,"charter_address_mismatch"))


if __name__=="__main__":
    unittest.main()
