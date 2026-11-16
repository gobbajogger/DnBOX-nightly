/* SPDX-License-Identifier: GPL-3.0-only */
/* R22 drum voice / SOUND page. Generated paths from
 * from-dot/R22-gallery/views/909-voice-00..10.svg and 808-voice-00..10.svg.
 * Included from ui.c after drum_strip_glyph. */

static const char *const DV_NAME_909[NDRUM] = {
    "KICK", "SNARE", "LOW TOM", "MID TOM", "HIGH TOM", "RIMSHOT", "HANDCLAP", "CLOSED HAT", "OPEN HAT", "CRASH", "RIDE"};
static const char *const DV_NAME_808[NDRUM] = {
    "KICK", "SNARE", "LOW TOM", "MID TOM", "HIGH TOM", "RIMSHOT", "HANDCLAP", "COWBELL", "CYMBAL", "OPEN HAT", "CLOSED HAT"};

static const char *dv_voice_name(int t, int v)
{
    if (v < 0 || v >= NDRUM) return "KIT";
    return t == T_808 ? DV_NAME_808[v] : DV_NAME_909[v];
}
static void dv_full_title(char *t, int part, int v)
{
    put_s(put_s(t, part == PART_808 ? "808 " : "909 "), dv_voice_name(part == PART_808 ? T_808 : T_909, v));
}

/* Exact authored millipixel coordinates: decode to float only for painting. */
static const uint16_t DV_XY[] = {
    15400, 5400, 15250, 6539, 14811, 7600, 14111, 8511, 13200, 9211, 12139, 9650,
    11000, 9800, 9861, 9650, 8800, 9211, 7889, 8511, 7189, 7600, 6750, 6539,
    6600, 5400, 6750, 4261, 7189, 3200, 7889, 2289, 8800, 1589, 9861, 1150,
    11000, 1000, 12139, 1150, 13200, 1589, 14111, 2289, 14811, 3200, 15250, 4261,
    15400, 5400, 7500, 8700, 5600, 10500, 14500, 8700, 16400, 10500, 11000, 9800,
    11000, 11000, 10000, 10800, 12000, 10800, 18500, 3000, 18261, 3427, 17562, 3825,
    16450, 4167, 15000, 4429, 13312, 4594, 11500, 4650, 9688, 4594, 8000, 4429,
    6550, 4167, 5438, 3825, 4739, 3427, 4500, 3000, 4739, 2573, 5438, 2175,
    6550, 1833, 8000, 1571, 9688, 1406, 11500, 1350, 13312, 1406, 15000, 1571,
    16450, 1833, 17562, 2175, 18261, 2573, 18500, 3000, 4500, 3000, 4500, 7700,
    6250, 8422, 8000, 8938, 9750, 9247, 11500, 9350, 13250, 9247, 15000, 8938,
    16750, 8422, 18500, 7700, 18500, 3000, 5000, 6700, 6625, 7356, 8250, 7825,
    9875, 8106, 11500, 8200, 13125, 8106, 14750, 7825, 16375, 7356, 18000, 6700,
    7000, 4700, 7000, 7500, 16000, 4700, 16000, 7500, 8500, 9300, 9500, 7900,
    11000, 9700, 12000, 8300, 13500, 9300, 14500, 7900, 17800, 2400, 17585, 2814,
    16956, 3200, 15955, 3531, 14650, 3786, 13131, 3945, 11500, 4000, 9869, 3945,
    8350, 3786, 7045, 3531, 6044, 3200, 5415, 2814, 5200, 2400, 5415, 1986,
    6044, 1600, 7045, 1269, 8350, 1014, 9869, 855, 11500, 800, 13131, 855,
    14650, 1014, 15955, 1269, 16956, 1600, 17585, 1986, 17800, 2400, 5200, 2400,
    5200, 7700, 6775, 8269, 8350, 8675, 9925, 8919, 11500, 9000, 13075, 8919,
    14650, 8675, 16225, 8269, 17800, 7700, 17800, 2400, 5850, 4000, 5850, 6300,
    17150, 4000, 17150, 6300, 6300, 8000, 5500, 10800, 16700, 8000, 17500, 10800,
    16800, 2400, 16619, 2814, 16090, 3200, 15248, 3531, 14150, 3786, 12872, 3945,
    11500, 4000, 10128, 3945, 8850, 3786, 7752, 3531, 6910, 3200, 6381, 2814,
    6200, 2400, 6381, 1986, 6910, 1600, 7752, 1269, 8850, 1014, 10128, 855,
    11500, 800, 12872, 855, 14150, 1014, 15248, 1269, 16090, 1600, 16619, 1986,
    16800, 2400, 6200, 2400, 6200, 6400, 7525, 6969, 8850, 7375, 10175, 7619,
    11500, 7700, 12825, 7619, 14150, 7375, 15475, 6969, 16800, 6400, 16800, 2400,
    6350, 4000, 6350, 5000, 16650, 4000, 16650, 5000, 11500, 7200, 11500, 10300,
    16000, 2400, 15847, 2814, 15397, 3200, 14682, 3531, 13750, 3786, 12665, 3945,
    11500, 4000, 10335, 3945, 9250, 3786, 8318, 3531, 7603, 3200, 7153, 2814,
    7000, 2400, 7153, 1986, 7603, 1600, 8318, 1269, 9250, 1014, 10335, 855,
    11500, 800, 12665, 855, 13750, 1014, 14682, 1269, 15397, 1600, 15847, 1986,
    16000, 2400, 7000, 2400, 7000, 5800, 8125, 6369, 9250, 6775, 10375, 7019,
    11500, 7100, 12625, 7019, 13750, 6775, 14875, 6369, 16000, 5800, 16000, 2400,
    6750, 4000, 6750, 4400, 16250, 4000, 16250, 4400, 11500, 7200, 11500, 10300,
    18000, 7000, 17761, 7544, 17062, 8050, 15950, 8485, 14500, 8819, 12812, 9028,
    11000, 9100, 9188, 9028, 7500, 8819, 6050, 8485, 4938, 8050, 4239, 7544,
    4000, 7000, 4239, 6456, 4938, 5950, 6050, 5515, 7500, 5181, 9188, 4972,
    11000, 4900, 12812, 4972, 14500, 5181, 15950, 5515, 17062, 5950, 17761, 6456,
    18000, 7000, 4000, 7000, 4000, 9000, 5750, 9547, 7500, 9938, 9250, 10172,
    11000, 10250, 12750, 10172, 14500, 9938, 16250, 9547, 18000, 9000, 18000, 7000,
    15500, 800, 10300, 6900, 16800, 1400, 11600, 7500, 3000, 9000, 7700, 4400,
    9400, 6200, 7000, 8700, 12000, 8200, 15800, 3400, 18000, 5200, 14200, 10000,
    9200, 11000, 3000, 9000, 9100, 3800, 11300, 1200, 13000, 2800, 11000, 5500,
    9100, 3800, 18500, 1300, 20500, 300, 20000, 4000, 22000, 4400, 3500, 5400,
    5500, 4503, 7500, 3863, 9500, 3478, 11500, 3350, 13500, 3478, 15500, 3863,
    17500, 4503, 19500, 5400, 17500, 5969, 15500, 6375, 13500, 6619, 11500, 6700,
    9500, 6619, 7500, 6375, 5500, 5969, 3500, 5400, 3500, 5400, 3800, 6500,
    5725, 7047, 7650, 7438, 9575, 7672, 11500, 7750, 13425, 7672, 15350, 7438,
    17275, 7047, 19200, 6500, 11500, 200, 11500, 2400, 10500, 2500, 12500, 2500,
    10300, 8100, 12700, 8100, 11500, 8200, 11500, 11600, 3500, 3600, 5500, 2725,
    7500, 2100, 9500, 1725, 11500, 1600, 13500, 1725, 15500, 2100, 17500, 2725,
    19500, 3600, 17500, 4191, 15500, 4612, 13500, 4866, 11500, 4950, 9500, 4866,
    7500, 4612, 5500, 4191, 3500, 3600, 3500, 3600, 3500, 8300, 5500, 7709,
    7500, 7287, 9500, 7034, 11500, 6950, 13500, 7034, 15500, 7287, 17500, 7709,
    19500, 8300, 17500, 8956, 15500, 9425, 13500, 9706, 11500, 9800, 9500, 9706,
    7500, 9425, 5500, 8956, 3500, 8300, 3500, 8300, 11500, 100, 11500, 900,
    10500, 1100, 12500, 1100, 11500, 5100, 11500, 6700, 10300, 10000, 12700, 10000,
    11500, 10100, 11500, 11700, 2000, 5200, 9000, 3300, 9500, 2789, 10000, 2406,
    10500, 2152, 11000, 2025, 11500, 2027, 12000, 2156, 12500, 2414, 13000, 2800,
    21000, 3700, 19062, 4533, 17000, 5181, 14812, 5645, 12500, 5925, 10062, 6020,
    7500, 5931, 4812, 5658, 2000, 5200, 2000, 5200, 11500, 4400, 11500, 10500,
    8400, 10700, 14500, 10700, 18000, 600, 19200, 1700, 2500, 5600, 3725, 5314,
    4850, 5006, 5875, 4677, 6800, 4325, 7625, 3952, 8350, 3556, 8975, 3139,
    9500, 2700, 10000, 2394, 10500, 2175, 11000, 2044, 11500, 2000, 12000, 2044,
    12500, 2175, 13000, 2394, 13500, 2700, 14047, 3139, 14688, 3556, 15422, 3952,
    16250, 4325, 17172, 4677, 18188, 5006, 19297, 5314, 20500, 5600, 18250, 6300,
    16000, 6800, 13750, 7100, 11500, 7200, 9250, 7100, 7000, 6800, 4750, 6300,
    2500, 5600, 2500, 5600, 11500, 2100, 11500, 10700, 8500, 10700, 14500, 10700,
    15400, 5400, 15250, 6539, 14811, 7600, 14111, 8511, 13200, 9211, 12139, 9650,
    11000, 9800, 9861, 9650, 8800, 9211, 7889, 8511, 7189, 7600, 6750, 6539,
    6600, 5400, 6750, 4261, 7189, 3200, 7889, 2289, 8800, 1589, 9861, 1150,
    11000, 1000, 12139, 1150, 13200, 1589, 14111, 2289, 14811, 3200, 15250, 4261,
    15400, 5400, 7500, 8700, 5600, 10500, 14500, 8700, 16400, 10500, 11000, 9800,
    11000, 11000, 10000, 10800, 12000, 10800, 18500, 3000, 18261, 3427, 17562, 3825,
    16450, 4167, 15000, 4429, 13312, 4594, 11500, 4650, 9688, 4594, 8000, 4429,
    6550, 4167, 5438, 3825, 4739, 3427, 4500, 3000, 4739, 2573, 5438, 2175,
    6550, 1833, 8000, 1571, 9688, 1406, 11500, 1350, 13312, 1406, 15000, 1571,
    16450, 1833, 17562, 2175, 18261, 2573, 18500, 3000, 4500, 3000, 4500, 7700,
    6250, 8422, 8000, 8938, 9750, 9247, 11500, 9350, 13250, 9247, 15000, 8938,
    16750, 8422, 18500, 7700, 18500, 3000, 5000, 6700, 6625, 7356, 8250, 7825,
    9875, 8106, 11500, 8200, 13125, 8106, 14750, 7825, 16375, 7356, 18000, 6700,
    7000, 4700, 7000, 7500, 16000, 4700, 16000, 7500, 8500, 9300, 9500, 7900,
    11000, 9700, 12000, 8300, 13500, 9300, 14500, 7900, 17800, 2400, 17585, 2814,
    16956, 3200, 15955, 3531, 14650, 3786, 13131, 3945, 11500, 4000, 9869, 3945,
    8350, 3786, 7045, 3531, 6044, 3200, 5415, 2814, 5200, 2400, 5415, 1986,
    6044, 1600, 7045, 1269, 8350, 1014, 9869, 855, 11500, 800, 13131, 855,
    14650, 1014, 15955, 1269, 16956, 1600, 17585, 1986, 17800, 2400, 5200, 2400,
    5200, 7700, 6775, 8269, 8350, 8675, 9925, 8919, 11500, 9000, 13075, 8919,
    14650, 8675, 16225, 8269, 17800, 7700, 17800, 2400, 5850, 4000, 5850, 6300,
    17150, 4000, 17150, 6300, 6300, 8000, 5500, 10800, 16700, 8000, 17500, 10800,
    16800, 2400, 16619, 2814, 16090, 3200, 15248, 3531, 14150, 3786, 12872, 3945,
    11500, 4000, 10128, 3945, 8850, 3786, 7752, 3531, 6910, 3200, 6381, 2814,
    6200, 2400, 6381, 1986, 6910, 1600, 7752, 1269, 8850, 1014, 10128, 855,
    11500, 800, 12872, 855, 14150, 1014, 15248, 1269, 16090, 1600, 16619, 1986,
    16800, 2400, 6200, 2400, 6200, 6400, 7525, 6969, 8850, 7375, 10175, 7619,
    11500, 7700, 12825, 7619, 14150, 7375, 15475, 6969, 16800, 6400, 16800, 2400,
    6350, 4000, 6350, 5000, 16650, 4000, 16650, 5000, 11500, 7200, 11500, 10300,
    16000, 2400, 15847, 2814, 15397, 3200, 14682, 3531, 13750, 3786, 12665, 3945,
    11500, 4000, 10335, 3945, 9250, 3786, 8318, 3531, 7603, 3200, 7153, 2814,
    7000, 2400, 7153, 1986, 7603, 1600, 8318, 1269, 9250, 1014, 10335, 855,
    11500, 800, 12665, 855, 13750, 1014, 14682, 1269, 15397, 1600, 15847, 1986,
    16000, 2400, 7000, 2400, 7000, 5800, 8125, 6369, 9250, 6775, 10375, 7019,
    11500, 7100, 12625, 7019, 13750, 6775, 14875, 6369, 16000, 5800, 16000, 2400,
    6750, 4000, 6750, 4400, 16250, 4000, 16250, 4400, 11500, 7200, 11500, 10300,
    18000, 7000, 17761, 7544, 17062, 8050, 15950, 8485, 14500, 8819, 12812, 9028,
    11000, 9100, 9188, 9028, 7500, 8819, 6050, 8485, 4938, 8050, 4239, 7544,
    4000, 7000, 4239, 6456, 4938, 5950, 6050, 5515, 7500, 5181, 9188, 4972,
    11000, 4900, 12812, 4972, 14500, 5181, 15950, 5515, 17062, 5950, 17761, 6456,
    18000, 7000, 4000, 7000, 4000, 9000, 5750, 9547, 7500, 9938, 9250, 10172,
    11000, 10250, 12750, 10172, 14500, 9938, 16250, 9547, 18000, 9000, 18000, 7000,
    15500, 800, 10300, 6900, 16800, 1400, 11600, 7500, 3000, 9000, 7700, 4400,
    9400, 6200, 7000, 8700, 12000, 8200, 15800, 3400, 18000, 5200, 14200, 10000,
    9200, 11000, 3000, 9000, 9100, 3800, 11300, 1200, 13000, 2800, 11000, 5500,
    9100, 3800, 18500, 1300, 20500, 300, 20000, 4000, 22000, 4400, 8400, 1000,
    14500, 1000, 18500, 9300, 16750, 9891, 15000, 10312, 13250, 10566, 11500, 10650,
    9750, 10566, 8000, 10312, 6250, 9891, 4500, 9300, 8400, 1000, 7600, 2500,
    15100, 2500, 5400, 9300, 6925, 8797, 8450, 8438, 9975, 8222, 11500, 8150,
    13025, 8222, 14550, 8438, 16075, 8797, 17600, 9300, 2000, 5200, 9000, 3300,
    9500, 2789, 10000, 2406, 10500, 2152, 11000, 2025, 11500, 2027, 12000, 2156,
    12500, 2414, 13000, 2800, 21000, 3700, 19062, 4533, 17000, 5181, 14812, 5645,
    12500, 5925, 10062, 6020, 7500, 5931, 4812, 5658, 2000, 5200, 2000, 5200,
    11500, 4400, 11500, 10500, 8400, 10700, 14500, 10700, 18000, 600, 19200, 1700,
    3500, 3600, 5500, 2725, 7500, 2100, 9500, 1725, 11500, 1600, 13500, 1725,
    15500, 2100, 17500, 2725, 19500, 3600, 17500, 4191, 15500, 4612, 13500, 4866,
    11500, 4950, 9500, 4866, 7500, 4612, 5500, 4191, 3500, 3600, 3500, 3600,
    3500, 8300, 5500, 7709, 7500, 7287, 9500, 7034, 11500, 6950, 13500, 7034,
    15500, 7287, 17500, 7709, 19500, 8300, 17500, 8956, 15500, 9425, 13500, 9706,
    11500, 9800, 9500, 9706, 7500, 9425, 5500, 8956, 3500, 8300, 3500, 8300,
    11500, 100, 11500, 900, 10500, 1100, 12500, 1100, 11500, 5100, 11500, 6700,
    10300, 10000, 12700, 10000, 11500, 10100, 11500, 11700, 3500, 5400, 5500, 4503,
    7500, 3863, 9500, 3478, 11500, 3350, 13500, 3478, 15500, 3863, 17500, 4503,
    19500, 5400, 17500, 5969, 15500, 6375, 13500, 6619, 11500, 6700, 9500, 6619,
    7500, 6375, 5500, 5969, 3500, 5400, 3500, 5400, 3800, 6500, 5725, 7047,
    7650, 7438, 9575, 7672, 11500, 7750, 13425, 7672, 15350, 7438, 17275, 7047,
    19200, 6500, 11500, 200, 11500, 2400, 10500, 2500, 12500, 2500, 10300, 8100,
    12700, 8100, 11500, 8200, 11500, 11600,
};
typedef struct { uint16_t off; uint8_t n; } dv_poly_t;
static const dv_poly_t DV_POLY[] = {
    {0, 25},
    {25, 2},
    {27, 2},
    {29, 2},
    {31, 2},
    {33, 25},
    {58, 11},
    {69, 9},
    {78, 2},
    {80, 2},
    {82, 2},
    {84, 2},
    {86, 2},
    {88, 25},
    {113, 11},
    {124, 2},
    {126, 2},
    {128, 2},
    {130, 2},
    {132, 25},
    {157, 11},
    {168, 2},
    {170, 2},
    {172, 2},
    {174, 25},
    {199, 11},
    {210, 2},
    {212, 2},
    {214, 2},
    {216, 25},
    {241, 11},
    {252, 2},
    {254, 2},
    {256, 10},
    {266, 5},
    {271, 2},
    {273, 2},
    {275, 18},
    {293, 9},
    {302, 2},
    {304, 2},
    {306, 2},
    {308, 2},
    {310, 18},
    {328, 18},
    {346, 2},
    {348, 2},
    {350, 2},
    {352, 2},
    {354, 2},
    {356, 20},
    {376, 2},
    {378, 2},
    {380, 2},
    {382, 34},
    {416, 2},
    {418, 2},
    {420, 25},
    {445, 2},
    {447, 2},
    {449, 2},
    {451, 2},
    {453, 25},
    {478, 11},
    {489, 9},
    {498, 2},
    {500, 2},
    {502, 2},
    {504, 2},
    {506, 2},
    {508, 25},
    {533, 11},
    {544, 2},
    {546, 2},
    {548, 2},
    {550, 2},
    {552, 25},
    {577, 11},
    {588, 2},
    {590, 2},
    {592, 2},
    {594, 25},
    {619, 11},
    {630, 2},
    {632, 2},
    {634, 2},
    {636, 25},
    {661, 11},
    {672, 2},
    {674, 2},
    {676, 10},
    {686, 5},
    {691, 2},
    {693, 2},
    {695, 12},
    {707, 2},
    {709, 9},
    {718, 20},
    {738, 2},
    {740, 2},
    {742, 2},
    {744, 18},
    {762, 18},
    {780, 2},
    {782, 2},
    {784, 2},
    {786, 2},
    {788, 2},
    {790, 18},
    {808, 9},
    {817, 2},
    {819, 2},
    {821, 2},
    {823, 2},
};
typedef struct { uint8_t first, npoly; } dv_body_t;
static const dv_body_t DV_BODY[2][NDRUM] = {
    {
        {0, 5},
        {5, 8},
        {13, 6},
        {19, 5},
        {24, 5},
        {29, 4},
        {33, 4},
        {37, 6},
        {43, 7},
        {50, 4},
        {54, 3},
    },
    {
        {57, 5},
        {62, 8},
        {70, 6},
        {76, 5},
        {81, 5},
        {86, 4},
        {90, 4},
        {94, 3},
        {97, 4},
        {101, 7},
        {108, 6},
    },
};

/* R22 layout (main-area y, origin at the first row under the 20 px header). */
#define DV_MAIN(y_screen) ((y_screen) - HDR_H)
static int dv_band_h(int band) { return band == 2 ? KNOB_H : BAND_H; }

static void dv_header_battery(int x, int y)
{
    int lvl = plat_battery();
    int bars, i;
    uint16_t ink = SOUND_GRAY;
    bars = lvl < 0 ? 0 : lvl > 3 ? 3 : lvl;
    if (bars < 0) bars = 0;
    /* r20 battery: 14 x 8 outline, three cells. */
    rbox(x, y, 14, 8, 1, SOUND_FACE);
    cv_rect(x, y, 14, 1, ink);
    cv_rect(x, y+7, 14, 1, ink);
    cv_rect(x, y, 1, 8, ink);
    cv_rect(x+13, y, 1, 8, ink);
    cv_rect(x+14, y+2, 2, 4, ink);
    for (i = 0; i < 3; i++) {
        uint16_t c = (i < bars) ? ink : SOUND_LINE;
        cv_rect(x+2+i*4, y+2, 3, 4, c);
    }
}

static UI_DRAW void dv_body_pictogram(int t, int v, int x, int y, float scale, float env, uint16_t col)
{
    const dv_body_t *b;
    float s, cx = x + 11.0f * 3.0f, cy = y + 6.0f * 3.0f;
    int p, i, n;
    uint16_t ink;
    if (t != T_808) t = T_909;
    if (v < 0 || v >= NDRUM) return;
    b = &DV_BODY[t == T_808][v];
    s = 3.0f * scale * (1.0f + 0.06f * env);
    ink = env > 0.02f ? blend(col, C_WHITE, (int)(env * 6.0f + 0.5f)) : col;
    for (p = 0; p < b->npoly; p++) {
        const dv_poly_t *pl = &DV_POLY[b->first + p];
        float xy[128];
        n = pl->n;
        if (n > 64) n = 64;
        for (i = 0; i < n; i++) {
            float px = (float)DV_XY[2 * (pl->off + i)] / 1000.0f;
            float py = (float)DV_XY[2 * (pl->off + i) + 1] / 1000.0f;
            xy[2*i]     = (float)x + (px - 11.0f) * s + 11.0f * 3.0f;
            xy[2*i + 1] = (float)y + (py - 5.4f) * s + 5.4f * 3.0f;
            (void)cx; (void)cy;
        }
        for(int j=1;j<n;j++) cv_stroke_aa(xy[2*j-2],xy[2*j-1],xy[2*j],xy[2*j+1],3.6f*scale,ink);
    }
}

/* TUNE fork (R22 path M9 0V6Q9 11 16 11Q23 11 23 6V0M16 11V17) that bends with tune. */
static UI_DRAW void dv_tune_fork(float ox, float oy, float sx, float sy, float tune01, uint16_t col)
{
    float mid = 16.0f, half = 7.0f * (0.62f + 0.76f * tune01); /* 14-wide at default ~0.27 */
    float drop = 11.0f + 2.0f * (tune01 - 0.27f);
    float tip = 17.0f + 1.5f * (tune01 - 0.27f);
    float L = mid - half, R = mid + half;
    float xy[40];
    int n = 0;
    #define P(X,Y) do { xy[2*n]=(ox)+(X)*sx; xy[2*n+1]=(oy)+(Y)*sy; n++; } while(0)
    P(L,0);P(L,6);
    for(int i=1;i<=8;i++) {
        float t=(float)i/8.f,mt=1.f-t;
        P(mt*mt*L+2*mt*t*L+t*t*mid,mt*mt*6+2*mt*t*drop+t*t*drop);
    }
    for(int i=1;i<=8;i++) {
        float t=(float)i/8.f,mt=1.f-t;
        P(mt*mt*mid+2*mt*t*R+t*t*R,mt*mt*drop+2*mt*t*drop+t*t*6);
    }
    P(R,0);
    cv_poly_aa(xy, n, col);
    n = 0;
    P(mid, drop); P(mid, tip);
    cv_poly_aa(xy, n, col);
    #undef P
}

/* Live AA glyph in an R22 slot. Box origin is the path origin (unit 0..32, 0..17). */
static UI_DRAW void dv_glyph(pref_t r, float ev, float ox, float oy, float sx, float sy, uint16_t col)
{
    int role = drum_strip_role(r);
    int val = (int)(ev + (ev >= 0 ? 0.5f : -0.5f));
    const x0x_param_t *d = pref_desc(r);
    float q = d && d->max ? ev / (float)d->max : 0;
    float e = 0;
    uint32_t age = 0xffffffffu;
    int live = drum_live(r, &age, &e);
    int i, n;
    float xy[80];
    if (q < 0) q = 0;
    if (q > 1) q = 1;
    if (d && name_is(d,"Pitch")) {
        /* Pitch is the 909 BD multiplier, not Tune's sweep time constant.
         * Show the actual pitched carrier's cycles over a fixed 40ms window. */
        float tau=dg_si(r,0,matrix_value(PR(R_ENG,T_909,0,0)));
        float m=.01f*dg_si(r,4,matrix_value(PR(R_ENG,T_909,0,4)));
        float pm=dg_si(r,5,val),hz=engine_bd909_hz(tau,m,pm,100.f);
        n=0;
        for(i=0;i<=32;i++) {
            float t=(float)i/32.f;
            xy[2*n]=ox+(1.f+30.f*t)*sx;
            xy[2*n+1]=oy+(6.f-5.f*fm_sinf(6.28318531f*hz*.04f*t))*sy;n++;
        }
        cv_poly_aa(xy,n,col);return;
    }
    if (role == DG_TUNE || (d && name_is(d, "Tune"))) {
        dv_tune_fork(ox, oy, sx, sy, q, col);
        return;
    }
    if (role == DG_ATTACK) {
        /* Normalized rising-edge symbol: x encodes attack AMOUNT, not time.
         * The parameter and its percentage retain the engine's click amount.
         * Zero is vertical; larger amounts lengthen the visible rising ramp. */
        float end=1.f+30.f*q;
        n=0;
        xy[2*n]=ox+sx;xy[2*n+1]=oy+12.f*sy;n++;
        xy[2*n]=ox+end*sx;xy[2*n+1]=oy;n++;
        xy[2*n]=ox+31.f*sx;xy[2*n+1]=oy;n++;
        cv_poly_aa(xy, n, live && age < 30u ? C_WHITE : col);
        return;
    }
    if (role == DG_DECAY || role == DG_NTAIL) {
        float ms = 0, reach;
        int uu = engine_param_si(r.a, r.b, r.c, val, &ms);
        if (uu == X0X_U_S) ms *= 1000.0f;
        if (uu != X0X_U_MS && uu != X0X_U_S) ms = q * 4000.0f;
        if (role == DG_NTAIL) ms = 24.0f + 0.7f * ms;
        if (ms < 0) ms = 0;
        if (ms > 4000) ms = 4000;
        reach = 8.0f + 23.0f * fm_sqrtf(ms / 4000.0f); /* 8..31 */
        n = 0;
        for (i = 0; i <= 16; i++) {
            float t = (float)i / 16.0f;
            float px,py;
            if(r.a==T_909 && (uu==X0X_U_MS || uu==X0X_U_S)) {
                /* The production 909 exponential reaches 1e-5 at Decay ms.
                 * A common 2s axis makes changing decay visibly meaningful. */
                px=1.f+30.f*t;
                py=12.f*(1.f-fm_exp2f(-16.60964047f*(2000.f*t)/(ms>0?ms:1.f)));
            } else {
                /* Untimed 808 controls remain raw controls, not invented ms. */
                px=1.f+t*reach;
                py=12.f*(1.f-fm_exp2f(-t*(2.2f+3.f*(1.f-q))));
                if(t*reach>reach-.01f)py=12.f;
            }
            xy[2*n] = ox + px * sx; xy[2*n+1] = oy + py * sy; n++;
        }
        cv_poly_aa(xy, n, col);
        return;
    }
    if (role == DG_BDSWEEP) { /* P.DPTH / PITCH: kick pitch drop, 0..100 ms */
        int c0 = 0, c4 = 4, c5 = 5;
        float tau = dg_si(r, c0, r.c == c0 ? val : matrix_value(PR(R_ENG, T_909, 0, c0)));
        float m = .01f * dg_si(r, c4, r.c == c4 ? val : matrix_value(PR(R_ENG, T_909, 0, c4)));
        float pm = dg_si(r, c5, r.c == c5 ? val : matrix_value(PR(R_ENG, T_909, 0, c5)));
        n = 0;
        for (i = 0; i <= 24; i++) {
            float tms = (float)i * 100.0f / 24.0f;
            float hz = engine_bd909_hz(tau, m, pm, tms);
            float yv = fm_log2f(hz / 40.0f) / 3.32f;
            if (yv < 0) yv = 0;
            if (yv > 1) yv = 1;
            xy[2*n] = ox + (31.0f * (float)i / 24.0f) * sx;
            xy[2*n+1] = oy + (12.0f * (1.0f - yv)) * sy;
            n++;
        }
        cv_poly_aa(xy, n, col);
        return;
    }
    if (role == DG_LPF) {
        /* Actual one-pole 808 BD tone response; logarithmic frequency axis.
         * bd_trigger sets c=1-exp(-2*pi*fc/sr), fc=300*20^(pot/127). */
        float hz=300.f*fm_exp2f(q*4.32192809f);
        float c=1.f-fm_exp2f(-6.28318531f*hz/44100.f*1.44269504f),a=1.f-c;
        n=0;
        for(i=0;i<=24;i++) {
            float t=(float)i/24.f,freq=100.f*fm_exp2f(t*7.78463485f);
            float den=1.f+a*a-2.f*a*fm_cosf(6.28318531f*freq/44100.f);
            float mag=den>0?c/fm_sqrtf(den):1.f;
            if(mag>1)mag=1;
            if(mag<0)mag=0;
            xy[2*n]=ox+31.f*t*sx;xy[2*n+1]=oy+(1.f+11.f*(1.f-mag))*sy;n++;
        }
        cv_poly_aa(xy, n, col);
        return;
    }
    if (role == DG_ACCENT) {
        /* four ticks, height follows accent */
        float hmax = 4.0f + 8.0f * q;
        for (i = 0; i < 4; i++) {
            float hx = 2.0f + i * 8.0f;
            float hh = hmax * (0.25f + 0.25f * (float)i);
            cv_line_aa(ox + hx * sx, oy + 12 * sy, ox + hx * sx, oy + (12.0f - hh) * sy, col);
        }
        return;
    }
    if (role == DG_SNAPPY || role == DG_SHELLS) {
        /* a live burst / two shells, scaled into the slot */
        float k = live ? (0.35f + 0.65f * e) : 1.0f;
        if (role == DG_SHELLS) {
            float tp = ev, ang = (tp <= 64 ? ev / 128.0f : 0.5f + (ev - 64.0f) * (0.5f / 63.0f)) * 1.5708f;
            float g1 = fm_cosf(ang) * 12.0f * k, g2 = fm_sinf(ang) * 12.0f * k;
            cv_line_aa(ox + 7 * sx, oy + 12 * sy, ox + 11 * sx, oy + (12 - g1) * sy, col);
            cv_line_aa(ox + 11 * sx, oy + (12 - g1) * sy, ox + 15 * sx, oy + 12 * sy, col);
            cv_line_aa(ox + 17 * sx, oy + 12 * sy, ox + 21 * sx, oy + (12 - g2) * sy, col);
            cv_line_aa(ox + 21 * sx, oy + (12 - g2) * sy, ox + 25 * sx, oy + 12 * sy, col);
        } else {
            n = 0;
            for (i = 0; i <= 16; i++) {
                float t = (float)i / 16.0f;
                float envp = fm_exp2f(-t * 3.5f);
                float h = q * k * envp * 12.0f;
                xy[2*n] = ox + (1 + t * 30) * sx;
                xy[2*n+1] = oy + (12.0f - h) * sy;
                n++;
            }
            cv_poly_aa(xy, n, col);
        }
        return;
    }
    /* fallback: a value-scaled arc */
    n = 0;
    for (i = 0; i <= 12; i++) {
        float t = (float)i / 12.0f;
        xy[2*n] = ox + (1 + t * 30) * sx;
        xy[2*n+1] = oy + (12.0f - 12.0f * q * fm_sinf(t * 3.1416f)) * sy;
        n++;
    }
    cv_poly_aa(xy, n, col);
}

static UI_DRAW void dv_value_text(pref_t r, int ev_i, int cx, int y, uint16_t col, int large)
{
    char num[16], unit[8], t[24];
    const felucca_font_t *f = large ? &FONT_S : &FONT_T;
    pref_value_of(r, ev_i, num, unit);
    t[0] = 0;
    put_s(put_s(t, num), unit);
    text_c(cx, y, f, t, col);
}

/* Format helpers already exist; text_c used above. */

static UI_DRAW void draw_drum_voice(int band)
{
    int off = band * BAND_H, bh = dv_band_h(band);
    int t = ui.part == PART_808 ? T_808 : T_909;
    int v = ui.sel[ui.part];
    int page = cur_page();
    int n = pg.n;
    int p, y, active;
    uint16_t col = part_col();
    uint16_t ink = col, gray = SOUND_GRAY, dimc = SOUND_DIM;
    uint32_t age = 0;
    float env = 0;
    int live;
    const dpart_t *dp;
    int len, s;
    int body_y, yb;
    cv_rect(0, 0, 240, bh, SOUND_BASE);

    /* body surface + banks: R22 y=24 (screen) => main y=4, height grows with bank count. */
    yb = DV_MAIN(24);
    /* Keep the lower voice/step panel compact. Spare space belongs to the
     * active controls, not an empty box between the pictogram and steps. */
    {
        int by = yb - off;
        int body_h;
        int used = 0;
        int ah;
        for (p = 0; p < n; p++) {
            int cells = 0, k;
            for (k = 0; k < 4; k++) if (pg.r[p][k].kind != R_NONE) cells++;
            ah = (p == page) ? (cells==1?56:72) : (cells>1?42:32);
            used += ah;
        }
        body_h = used + 4;
        if (by + body_h > 0 && by < bh)
            rbox(3, by, 234, body_h, 9, SOUND_FACE);
        /* banks */
        y = yb + 2;
        for (p = 0; p < n; p++) {
            int cells = 0, k, cx0;
            for (k = 0; k < 4; k++) if (pg.r[p][k].kind != R_NONE) cells++;
            if (cells < 1) cells = 1;
            active = (p == page);
            ah = active ? (cells==1?56:72) : (cells>1?42:32);
            if (active) {
                int ay = y - off;
                if (ay + ah > 0 && ay < bh)
                    rbox(6, ay, 228, ah, 9, RGB(36,48,54));
            }
            /* labels */
            {
                                int ly = y + 2 - off;
                char pgind[8], a[16], b[16];
                const x0x_param_t *pd0;
                a[0] = b[0] = 0;
                if (pg.r[p][0].kind == R_ENG && pg.r[p][0].b == NDRUM) {
                    put_s(a, "KIT"); put_s(b, pref_name(pg.r[p][0]));
                } else {
                    put_s(a, "SOUND");
                    pd0 = pref_desc(pg.r[p][0]);
                    /* Multi-control rows already label each cell; a second
                     * first-control summary would overprint that caption. */
                    if (cells==1 && pd0 && pd0->name) {
                        const char *nm = pd0->name;
                        if (name_is(pd0, "Pitch"))put_s(b,"PITCH");
                        else if(name_is(pd0,"P.Dpth"))put_s(b,"DEPTH");
                        else {
                            int i; char *d = b;
                            for (i = 0; nm[i] && i < 12; i++) {
                                char c = nm[i];
                                if (c >= 'a' && c <= 'z') c = (char)(c - 32);
                                *d++ = c;
                            }
                            *d = 0;
                        }
                    }
                }
                if (ly + 12 > 0 && ly < bh) {
                    cv_text(11, ly, &FONT_T, a, gray);
                    put_s(put_i(put_s(put_i(pgind, p + 1), "/"), pg.n), "");
                    text_r(232, ly, &FONT_T, pgind, gray);
                }
                /* The second line may enter this strip after the first line
                 * has left it. Test its own bounds, not the first line's. */
                if (b[0] && ly + 24 > 0 && ly + 12 < bh)
                    cv_text(11, ly + 12, &FONT_T, b, gray);
            }
            /* glyphs + values */
            cx0 = 11;
            for (k = 0; k < 4; k++) {
                pref_t r = pg.r[p][k];
                int ev_i, vx, gy, gx;
                float ev;
                if (r.kind == R_NONE) continue;
                ev_i = matrix_value(r);
                ev = ui_ease_float(r,ev_i);
                /* Only the pictogram eases; numeric state is committed now. */
                if (active && cells >= 2) {
                    vx=6+(228*(2*k+1))/(2*cells);
                    gx=vx-22;
                    gy=y+28;
                    {
                        char caption[16];const x0x_param_t *d=pref_desc(r);int j=0;
                        if(d&&d->name)for(;d->name[j]&&j<14;j++)caption[j]=d->name[j]>='a'&&d->name[j]<='z'?d->name[j]-32:d->name[j];
                        caption[j]=0;
                        if(d&&name_is(d,"P.Dpth"))put_s(caption,"DEPTH");
                        text_c(vx,y+14-off,&FONT_T,caption,gray);
                    }
                    float glyph_sy=1.50f+(float)(ah-72)*.025f;
                    if (gy-off < bh && (float)(gy-off)+18.f*glyph_sy+2.f > 0)
                        dv_glyph(r, ev, (float)gx, (float)(gy-off),1.375f,glyph_sy,ink);
                    if (y + ah - 20 - off < bh && y + ah - 20 - off + 16 > 0)
                        dv_value_text(r, ev_i, vx, y + ah - 20 - off, SOUND_WHITE, 1);
                } else if (active) {
                    /* single-control active bank (e.g. rimshot Tune): centered large glyph */
                    gx = 92; gy = y + 25;
                    if (gy - off < bh)
                        dv_glyph(r, ev, (float)gx, (float)(gy - off), 1.8f, 1.8f, ink);
                    dv_value_text(r, ev_i, 214, y + 35 - off, SOUND_WHITE, 1);
                } else if(cells>1) {
                    /* Each real control retains its own labeled compact cell.
                     * A shared centre/right position would overprint siblings. */
                    gx=6+(228*(2*k+1))/(2*cells)-22;gy=y+29;
                    const x0x_param_t *d=pref_desc(r);char caption[16];int j=0;
                    if(d&&d->name)for(;d->name[j]&&j<14;j++)caption[j]=d->name[j]>='a'&&d->name[j]<='z'?d->name[j]-32:d->name[j];
                    caption[j]=0;
                    if(d&&name_is(d,"P.Dpth"))put_s(caption,"DEPTH");
                    text_c(gx+22,y+14-off,&FONT_T,caption,gray);
                    if(gy-off<bh&&gy+17-off>0)dv_glyph(r,ev,(float)gx,(float)(gy-off),.62f,.76f,gray);
                    dv_value_text(r,ev_i,gx+40,y+29-off,SOUND_WHITE,0);
                } else {
                    /* A single-control summary has one glyph and one value. */
                    gx = 98; gy = y + 5;
                    if (gy - off < bh && gy + 20 - off > 0)
                        dv_glyph(r, ev, (float)gx, (float)(gy - off), 1.3f, 1.5f, gray);
                    dv_value_text(r, ev_i, 214, y + 15 - off, SOUND_WHITE, 1);
                }
                (void)cx0;
            }
            y += ah;
        }
        body_y = yb + body_h + 4; /* gap before the lower panel */
    }

    /* lower panel: body pictogram, voice name, P1/16, 16-step strip */
    live = engine_drum_view(ui.part, v, &age, &env);
    if (!live) env = 0;
    {
        int py = body_y - off;
        int ph = 237 - HDR_H - body_y; /* to screen y=237 */
        int pat_i, slen;
        if (ph < 40) ph = 40;
        if (py + ph > 0 && py < bh) {
            rbox(3, py, 234, ph, 9, SOUND_FACE);
            /* Real voice identity and actual16 steps share the remaining
             * context surface. Rows reflow; no activity or data is invented. */
            int cols=ph>=88?4:8, rows=16/cols;
            int left=cols==4?124:118, pitch=(228-left)/cols;
            int step_top=body_y+19, step_h=(ph-24)/rows;
            float body_scale=ph<64?.65f:1.f;
            int body_height=(int)(47.f*body_scale);
            dv_body_pictogram(t,v,10,body_y+(ph-body_height)/2-off,body_scale,env,col);
            cv_text(11,body_y+3-off,&FONT_T,dv_voice_name(t,v),col);
            pat_i = seq.ppat[ui.part];
            slen = cur_pat()->drum[ui.part].len;
            if (slen < 1) slen = 16;
            {
                char rhs[16];
                put_s(put_i(put_s(put_i(put_s(rhs, "P"), pat_i + 1), " / "), slen > 16 ? 16 : slen), "");
                text_r(226,body_y+3-off,&FONT_T,rhs,gray);
                char id[16];put_i(put_s(id,t==T_808?"808 / ":"909 / "),v+1);
                cv_text(11,body_y+ph-14-off,&FONT_T,id,gray);
            }
            dp = &cur_pat()->drum[ui.part];
            len = dp->len;
            for (s = 0; s < 16; s++) {
                int sx = left+(s%cols)*pitch;
                int sy=step_top+(s/cols)*step_h-off;
                int hit = s < NSTEPS && s < len && sm_get(dp->hit[v], s);
                int curstep = seq.playing && (eng_step[TRK_DRUM + ui.part] % (len ? len : 16)) == s;
                uint16_t sc = hit ? col : SOUND_LINE;
                if (curstep) sc = C_WHITE;
                cv_rect(sx, sy, 11, 4, sc);
                {
                    char nn[4];put_i(nn, s + 1);
                    text_c(sx+5,sy+6,&FONT_T,nn,gray);
                }
            }
        }
    }
}


