import unittest
from nyc_import_values import number, demographic_percent, exam

class SourceValues(unittest.TestCase):
    def test_zero_is_not_suppression(self):
        self.assertEqual(number('0', True), 0)
        self.assertEqual(demographic_percent('0'), 0)
        for value in ['s', '', None, '*', 'Above 95%', 'Below 5%']:
            self.assertIsNone(number(value))
    def test_units_and_bounds(self):
        self.assertEqual(number('74.85', True), 74.8)
        self.assertEqual(demographic_percent('.278'), 27.8)
        for value in ['NaN', '-1', 'bad value']:
            with self.assertRaises(ValueError): number(value)
        with self.assertRaises(ValueError): number('101', True)
        with self.assertRaises(ValueError): demographic_percent('27.8')
    def test_distinct_curricula_remain_distinct(self):
        for a,b in [('Biology','Living Environment'),('Earth Space Sciences','Physical Settings/Earth Science'),
                    ('Integrated Algebra','Common Core Algebra'),('Algebra2/Trigonometry','Common Core Algebra2'),
                    ('English','Common Core English'),('Geometry','Common Core Geometry')]:
            self.assertNotEqual(exam(a),exam(b))
        self.assertEqual(exam('Physical Settings/Chemistry'), 'Chemistry')

if __name__ == '__main__': unittest.main()
