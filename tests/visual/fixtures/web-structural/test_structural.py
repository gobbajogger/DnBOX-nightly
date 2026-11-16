#!/usr/bin/env python3
"""Pure detector unit tests. These do not claim browser proof."""
import importlib.util
from pathlib import Path
import unittest

SPEC = importlib.util.spec_from_file_location('slice', Path(__file__).parents[2] / 'web_structural_slice.py')
gate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gate)


def rect(x, y, w, h):
    return {'x': x, 'y': y, 'w': w, 'h': h}


def snapshot(controls=(), glyphs=(), panels=()):
    return {'screen': {'id': 'test', 'rect': rect(0, 0, 100, 100)},
            'controls': list(controls), 'glyphs': list(glyphs), 'panels': list(panels),
            'collectionErrors': []}


def control(ref, name='control'):
    return {'id': name, 'param': ref, 'rect': rect(0, 0, 10, 10)}


def glyph(ref, caption='TUNE', family='TUNE'):
    return {'id': 'glyph', 'param': ref, 'type': family,
            'caption': caption, 'captionPainted': True, 'rect': rect(0, 0, 10, 10)}


class StructuralTests(unittest.TestCase):
    def check(self, data, index):
        return gate.analyze_snapshot(data)['checks'][index - 1]

    def test_duplicate_ref_ignores_frame_path_and_occurrence(self):
        data = snapshot([control('one.svg|1:0:0:0', 'one'), control('two.svg|1:0:0:0', 'two')])
        self.assertEqual(self.check(data, 1)['status'], 'FAIL')
        self.assertEqual(len(self.check(data, 1)['failures']), 1)

    def test_distinct_tune_pitch_refs_are_not_invented_duplicates(self):
        data = snapshot([control('909.svg|1:0:0:0'), control('909.svg|1:0:0:5')],
                        [glyph('909.svg|1:0:0:0'), glyph('909.svg|1:0:0:5', 'PITCH')])
        self.assertEqual(self.check(data, 1)['status'], 'PASS')
        self.assertEqual(self.check(data, 2)['status'], 'PASS')

    def test_bank_is_part_of_typed_identity(self):
        data = snapshot([control('source-sound/miami/0|1:2:0:0:0'), control('source-sound/chicago/0|1:2:0:0:1')])
        self.assertEqual(self.check(data, 1)['status'], 'PASS')

    def test_slot_is_part_of_source_sound_identity(self):
        data = snapshot([control('source-sound/chicago/0|1:2:0:0'), control('source-sound/chicago/1|1:2:0:0')])
        self.assertEqual(self.check(data, 1)['status'], 'PASS')

    def test_break_minus_one_context_is_valid_and_distinct_from_drum(self):
        ref=gate.typed_ref('source-sound/BREAK/-1|1:3:0:0:-1')
        self.assertEqual(ref,(1,3,0,0,-1,4))
        self.assertEqual(self.check(snapshot([control('source-sound/BREAK/-1|1:3:0:0:-1')]),1)['status'],'PASS')
        self.assertIsNone(gate.typed_ref('source-sound/CHICAGO/-1|1:2:0:0:0'))

    def test_real_full_captions_are_not_cryptic_and_unknown_copy_is_pending(self):
        for caption in ('STEREO','REV LOW CUT','EDIT 1','SUB','ENV/GATE','909'):
            self.assertEqual(self.check(snapshot(glyphs=[glyph('a|1:0:0:0',caption)]),4)['status'],'PASS',caption)
        self.assertEqual(self.check(snapshot(glyphs=[glyph('a|1:0:0:0','UNLISTED')]),4)['status'],'REVIEW_REQUIRED')

    def test_partial_panel_never_confuses_unseen_content_with_dead_space(self):
        p={'id':'scrolling','rect':rect(0,0,100,200),'visibleRect':rect(0,0,100,100),'contentRects':[rect(0,0,100,100)]}
        result=self.check(snapshot(panels=[p]),3)
        self.assertEqual(result['status'],'NOT_RUN')
        self.assertFalse(result['failures'])
        self.assertTrue(result['measurements'][0]['partialView'])

    def test_invalid_untyped_ref_fails_closed(self):
        self.assertEqual(self.check(snapshot([control('TUNE')]), 1)['status'], 'FAIL')
        self.assertEqual(self.check(snapshot([control('x|1:0:0:')]), 1)['status'], 'FAIL')

    def test_same_type_same_typed_ref_is_duplicate_glyph(self):
        data = snapshot(glyphs=[glyph('a|1:0:0:0'), glyph('b|1:0:0:0')])
        self.assertEqual(self.check(data, 2)['status'], 'FAIL')

    def test_no_controls_is_not_a_pass(self):
        for i in (1, 2, 3, 4):
            self.assertEqual(self.check(snapshot(), i)['status'], 'NOT_RUN')

    def test_missing_caption_does_not_fall_back_to_param_or_aria(self):
        data = snapshot(glyphs=[glyph('a|1:0:0:0', '')])
        self.assertEqual(self.check(data, 4)['status'], 'FAIL')

    def test_cryptic_caption_fails_and_explicit_whitelist_is_enforced(self):
        for label in ('P.DPTH', 'P.DEPTH', 'A'):
            self.assertEqual(self.check(snapshot(glyphs=[glyph('a|1:0:0:0', label)]), 4)['status'], 'FAIL', label)
        for label in ('TUNE', 'ATTACK', 'Pitch depth', 'PAN', 'HPF'):
            self.assertEqual(self.check(snapshot(glyphs=[glyph('a|1:0:0:0', label)]), 4)['status'], 'PASS', label)

    def test_hidden_caption_fails_even_if_text_is_present(self):
        g = glyph('a|1:0:0:0'); g['captionPainted'] = False
        self.assertEqual(self.check(snapshot(glyphs=[g]), 4)['status'], 'FAIL')

    def test_sparse_panel_uses_full_panel_no_padding_deduction(self):
        data = snapshot(panels=[{'id': '808', 'rect': rect(0, 0, 100, 100),
                                'contentRects': [rect(5, 5, 90, 20)]}])
        row = self.check(data, 3)
        self.assertEqual(row['status'], 'FAIL')
        self.assertAlmostEqual(row['measurements'][0]['contentCoverage'], .18)
        self.assertAlmostEqual(row['measurements'][0]['largestEmptyScreenFraction'], .75)

    def test_bbox_coverage_is_not_union_coverage(self):
        rs = [rect(0, 0, 1, 1), rect(99, 99, 1, 1)]
        row = self.check(snapshot(panels=[{'id': 'corners', 'rect': rect(0, 0, 100, 100), 'contentRects': rs}]), 3)
        self.assertEqual(row['measurements'][0]['contentCoverage'], 1)
        self.assertEqual(row['status'], 'FAIL')  # bbox alone cannot hide giant gaps

    def test_thresholds_are_inclusive_70_and_12_not_rounded(self):
        # Dense strips fill full bbox; the only gap is exactly12% of screen.
        rs = [rect(0, 0, 44, 100), rect(56, 0, 44, 100)]
        p = {'id': 'threshold', 'rect': rect(0, 0, 100, 100), 'contentRects': rs}
        self.assertEqual(self.check(snapshot(panels=[p]), 3)['status'], 'PASS')
        p['contentRects'][1] = rect(56.001, 0, 43.999, 100)
        self.assertEqual(self.check(snapshot(panels=[p]), 3)['status'], 'FAIL')
        # Panel occupies10%screen so gap limit does not obscure coverage boundary.
        p = {'id': 'coverage', 'rect': rect(0, 0, 100, 10), 'contentRects': [rect(0, 0, 100, 7)]}
        self.assertEqual(self.check(snapshot(panels=[p]), 3)['status'], 'PASS')
        p['contentRects'] = [rect(0, 0, 100, 6.999)]
        self.assertEqual(self.check(snapshot(panels=[p]), 3)['status'], 'FAIL')

    def test_largest_empty_rect_finds_interior_not_just_edge_gap(self):
        rs = [rect(0, 0, 100, 10), rect(0, 90, 100, 10), rect(0, 10, 10, 80), rect(90, 10, 10, 80)]
        r = gate.largest_empty_rect(rect(0, 0, 100, 100), rs)
        self.assertEqual(r, rect(10, 10, 80, 80))

    def test_geometry_clips_content_and_does_not_count_outside_paint(self):
        p = {'id': 'outside', 'rect': rect(0, 0, 100, 100), 'contentRects': [rect(-100, -100, 50, 50)]}
        row = self.check(snapshot(panels=[p]), 3)
        self.assertEqual(row['measurements'][0]['contentCoverage'], 0)
        self.assertEqual(row['measurements'][0]['largestEmptyScreenFraction'], 1)

    def test_exact_empty_rectangle_matches_bruteforce_small_grid(self):
        # Independent integer-grid oracle covers overlapping/interior obstacles.
        import random
        rng = random.Random(240220)
        for _ in range(60):
            obstacles = []
            for _ in range(rng.randrange(1, 6)):
                x, y = rng.randrange(6), rng.randrange(6)
                obstacles.append(rect(x, y, rng.randrange(1, 7 - x), rng.randrange(1, 7 - y)))
            best = 0
            for x in range(6):
                for y in range(6):
                    for right in range(x + 1, 7):
                        for bottom in range(y + 1, 7):
                            if not any(x < r['x'] + r['w'] and right > r['x'] and y < r['y'] + r['h'] and bottom > r['y'] for r in obstacles):
                                best = max(best, (right - x) * (bottom - y))
            actual = gate.largest_empty_rect(rect(0, 0, 6, 6), obstacles)
            self.assertEqual(actual['w'] * actual['h'], best)

    def test_collection_error_cannot_pass(self):
        data = snapshot([control('a|1:0:0:0')]); data['collectionErrors'] = ['canvas unreadable']
        self.assertFalse(gate.analyze_snapshot(data)['accepted'])


if __name__ == '__main__':
    unittest.main()
