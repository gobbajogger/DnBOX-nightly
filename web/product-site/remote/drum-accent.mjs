// SPDX-License-Identifier: GPL-3.0-only
// Stock pattern.h stores one dpart_t.accent bit per kit and step.
// A trace of note velocities does not identify those bits.
export const drumAccent = Object.freeze({
 label: 'Accent',
 domain: Object.freeze([false, true]),
 text: value => value == null ? 'Not set' : value ? 'On' : 'Off'
});
