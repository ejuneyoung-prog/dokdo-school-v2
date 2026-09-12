#!/usr/bin/env python3
from pathlib import Path
import tempfile,unittest,sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tools'))
from switch_homepage import switch,MARK
class HomepageSwitch(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
  (self.root/'dokdo-next').mkdir();(self.root/'dokdo-next/index.html').write_text('new')
  (self.root/'index.html').write_text('<p>old home</p>')
 def tearDown(self):self.tmp.cleanup()
 def test_dry_run_never_changes_original(self):
  switch(self.root);self.assertEqual((self.root/'index.html').read_text(),'<p>old home</p>')
 def test_promote_preserves_original_and_redirects(self):
  switch(self.root,True);self.assertEqual((self.root/'index.before-dokdo-next.html').read_text(),'<p>old home</p>')
  self.assertIn(MARK,(self.root/'index.html').read_text())
 def test_repeat_is_idempotent(self):
  switch(self.root,True);self.assertEqual(switch(self.root,True)['operation'],'already-promoted')
 def test_rollback_preserves_original(self):
  switch(self.root,True);switch(self.root,True,True);self.assertEqual((self.root/'index.html').read_text(),'<p>old home</p>')
 def test_conflicting_new_edits_block_rollback(self):
  switch(self.root,True);(self.root/'index.html').write_text('edited by owner')
  with self.assertRaises(ValueError):switch(self.root,True,True)
 def test_existing_backup_is_never_overwritten(self):
  (self.root/'index.before-dokdo-next.html').write_text('different old backup')
  with self.assertRaises(ValueError):switch(self.root,True)
 def test_missing_app_blocks_promotion(self):
  (self.root/'dokdo-next/index.html').unlink()
  with self.assertRaises(ValueError):switch(self.root,True)
if __name__=='__main__':unittest.main()
