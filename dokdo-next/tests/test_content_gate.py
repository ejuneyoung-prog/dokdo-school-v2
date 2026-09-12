"""Negative tests: confirm known editorial/structural failures stop the build.
These tests cannot certify pedagogy; the author-reviewed text remains auditable.
"""
import copy, importlib.util, unittest
from pathlib import Path
P=Path(__file__).resolve().parents[1]/'tools/content/build_course.py'
spec=importlib.util.spec_from_file_location('builder',P);B=importlib.util.module_from_spec(spec);spec.loader.exec_module(B)
class ContentGate(unittest.TestCase):
    def setUp(self):
        self.q=B.read('authored-questions.json');self.s=B.read('source-registry.json');self.m=B.read('course-meta.json');self.r=B.read('retired-ids.json')
    def fail_build(self):
        with self.assertRaises((ValueError,KeyError,TypeError)):B.compile_data(self.q,self.s,self.m,self.r)
    def test_valid_authored_set(self):
        d,a,_=B.compile_data(self.q,self.s,self.m,self.r);self.assertEqual(len(d['questions']),240);self.assertEqual(a['optionFeedbackPairs'],711)
    def test_missing_reason_does_not_fall_back_to_fact(self):
        self.q[0]['options'][0]['feedback']['ko']='';self.fail_build()
    def test_generic_family_fact_cannot_silently_replace_reason(self):
        self.q[0]['options'][0]['feedback']['ko']=self.q[0]['takeaway']['ko'];self.fail_build()
    def test_all_choices_cannot_share_same_reason(self):
        self.q[0]['options'][1]['feedback']=copy.deepcopy(self.q[0]['options'][0]['feedback']);self.fail_build()
    def test_missing_evidence_blocks_even_easy_question(self):
        q=next(q for q in self.q if q['difficulty']<=2 and q['requiresMaterial']);q['material']['ko']='';self.fail_build()
    def test_table_reference_requires_table_without_flag(self):
        q=self.q[0];q['stem']['en']='What does the given table show?';q['requiresMaterial']=False;self.fail_build()
    def test_country_must_be_on_source_record(self):
        self.s['location']['publisherCountry']='';self.fail_build()
    def test_japanese_historic_actor_is_not_modern_publisher(self):
        self.s['ban1696']['publisherCountry']='Japan';self.fail_build()
    def test_precise_source_locator_required(self):
        self.s['location']['locator']='';self.fail_build()
    def test_inactive_id_cannot_return(self):
        self.q[0]['id']=910001;self.fail_build()
    def test_duplicate_question_ids_fail(self):
        self.q[1]['id']=self.q[0]['id'];self.fail_build()
    def test_duplicate_option_ids_fail(self):
        self.q[0]['options'][1]['id']='a';self.fail_build()
    def test_missing_correct_id_fails(self):
        self.q[0]['correctOptionId']='missing';self.fail_build()
    def test_missing_english_reason_fails(self):
        del self.q[0]['options'][1]['feedback']['en'];self.fail_build()
    def test_incomplete_route_cannot_fallback_to_old_bank(self):
        self.m['tracks']['middle']['questionIds'][0]=910001;self.fail_build()
    def test_invisible_map_material_cannot_be_removed(self):
        q=next(q for q in self.q if q['requiresMaterial']);q['material']={'ko':'','en':''};self.fail_build()
    def test_deterministic_compilation(self):
        self.assertEqual(B.compile_data(self.q,self.s,self.m,self.r),B.compile_data(self.q,self.s,self.m,self.r))
    def test_every_compiled_choice_matches_its_authored_feedback(self):
        d,_,_=B.compile_data(self.q,self.s,self.m,self.r);byid={q['id']:q for q in self.q}
        for item in d['questions']:
            q=byid[item['id']];opts={o['id']:o for o in q['options']}
            self.assertEqual(item['choiceIds'][item['answer']],q['correctOptionId'])
            for i,oid in enumerate(item['choiceIds']):
                for lang in ['ko','en']:
                    self.assertEqual(item[lang]['choices'][i],opts[oid]['text'][lang]);self.assertEqual(item[lang]['wrong'][i],opts[oid]['feedback'][lang])
if __name__=='__main__':unittest.main()
