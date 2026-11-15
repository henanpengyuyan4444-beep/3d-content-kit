window.MANUALS = window.MANUALS || {};
window.MANUALS["main"] = {
  "id": "demo-bookcase",
  "sku": "示例书柜 80×28×202",
  "brand": "示例家具",
  "title": "示例书柜 80×28×202",
  "subtitle": "示例家具 · 800×2020×280 毫米",
  "source": {
    "name": "示例手册（本仓库自绘，不含任何厂商资料）",
    "url": ""
  },
  "product": {
    "w": 0.8,
    "d": 0.28,
    "h": 2.02
  },
  "camera": {
    "pos": [
      1.45,
      1.62,
      1.95
    ],
    "target": [
      0,
      1.01,
      0
    ]
  },
  "parts": [
    {
      "id": "A",
      "name": "左侧板",
      "dims": [
        0.018,
        2.02,
        0.28
      ],
      "at": [
        -0.391,
        1.01,
        0
      ],
      "explode": [
        -0.16,
        0,
        0
      ]
    },
    {
      "id": "B",
      "name": "右侧板",
      "dims": [
        0.018,
        2.02,
        0.28
      ],
      "at": [
        0.391,
        1.01,
        0
      ],
      "explode": [
        0.16,
        0,
        0
      ]
    },
    {
      "id": "C",
      "name": "顶板",
      "dims": [
        0.764,
        0.018,
        0.28
      ],
      "at": [
        0,
        2.011,
        0
      ],
      "explode": [
        0,
        0.12606666666666666,
        0
      ]
    },
    {
      "id": "D",
      "name": "底板",
      "dims": [
        0.764,
        0.018,
        0.28
      ],
      "at": [
        0,
        0.075,
        0
      ],
      "explode": [
        0,
        -0.12606666666666666,
        0
      ]
    },
    {
      "id": "E",
      "name": "中间固定隔板",
      "dims": [
        0.764,
        0.018,
        0.28
      ],
      "at": [
        0,
        0.72,
        0
      ],
      "explode": [
        0,
        -0.12606666666666666,
        0
      ]
    },
    {
      "id": "F",
      "name": "层板 1",
      "dims": [
        0.764,
        0.018,
        0.262
      ],
      "at": [
        0,
        0.98,
        0
      ],
      "explode": [
        0,
        -0.12606666666666666,
        0
      ]
    },
    {
      "id": "G",
      "name": "层板 2",
      "dims": [
        0.764,
        0.018,
        0.262
      ],
      "at": [
        0,
        1.22,
        0
      ],
      "explode": [
        0,
        0.12606666666666666,
        0
      ]
    },
    {
      "id": "H",
      "name": "层板 3",
      "dims": [
        0.764,
        0.018,
        0.262
      ],
      "at": [
        0,
        1.46,
        0
      ],
      "explode": [
        0,
        0.12606666666666666,
        0
      ]
    },
    {
      "id": "I",
      "name": "层板 4",
      "dims": [
        0.764,
        0.018,
        0.262
      ],
      "at": [
        0,
        1.72,
        0
      ],
      "explode": [
        0,
        0.12606666666666666,
        0
      ]
    },
    {
      "id": "J",
      "name": "背板",
      "dims": [
        0.8,
        2.02,
        0.004
      ],
      "at": [
        0,
        1.01,
        -0.138
      ],
      "explode": [
        0,
        0,
        -0.16
      ],
      "back": true,
      "color": 14670285
    }
  ],
  "hardwareCatalog": {
    "dowel": {
      "name": "木榫",
      "no": "",
      "qty": 3
    },
    "camscrew": {
      "name": "偏心螺丝",
      "no": "",
      "qty": 2
    },
    "cam": {
      "name": "偏心轮",
      "no": "",
      "qty": 3
    },
    "nail": {
      "name": "钉子",
      "no": "",
      "qty": 1
    },
    "bracket": {
      "name": "墙固定件",
      "no": "",
      "qty": 1
    }
  },
  "tools": [
    "十字螺丝刀",
    "锤子"
  ],
  "steps": [
    {
      "n": 1,
      "title": "把木榫敲进四块横板",
      "text": "每块板四根，敲到底，不要外露。",
      "hardware": [
        {
          "type": "dowel",
          "host": "C",
          "count": 5
        },
        {
          "type": "dowel",
          "host": "D",
          "count": 5
        },
        {
          "type": "dowel",
          "host": "E",
          "count": 5
        }
      ],
      "added": [],
      "ref": "manual-pages/p06.svg",
      "refPage": 6
    },
    {
      "n": 2,
      "title": "把偏心螺丝拧进两块侧板",
      "text": "每块 6 颗，螺杆朝板内。",
      "hardware": [
        {
          "type": "camscrew",
          "host": "A",
          "count": 6
        },
        {
          "type": "camscrew",
          "host": "B",
          "count": 6
        }
      ],
      "added": [],
      "ref": "manual-pages/p07.svg",
      "refPage": 7
    },
    {
      "n": 3,
      "title": "侧板扣到底板",
      "text": "对准底板两端的木榫，垂直压到底。",
      "hardware": [],
      "added": [
        "A",
        "B",
        "D"
      ],
      "ref": "manual-pages/p07.svg",
      "refPage": 7
    },
    {
      "n": 4,
      "title": "锁紧底板偏心轮",
      "text": "",
      "hardware": [
        {
          "type": "cam",
          "host": "D",
          "count": 4
        }
      ],
      "added": [],
      "ref": "manual-pages/p08.svg",
      "refPage": 8
    },
    {
      "n": 5,
      "title": "装上中间隔板",
      "text": "",
      "hardware": [
        {
          "type": "cam",
          "host": "E",
          "count": 2
        }
      ],
      "added": [
        "E"
      ],
      "ref": "manual-pages/p08.svg",
      "refPage": 8
    },
    {
      "n": 6,
      "title": "盖上顶板",
      "text": "",
      "hardware": [],
      "added": [
        "C"
      ],
      "ref": "manual-pages/p08.svg",
      "refPage": 8
    },
    {
      "n": 7,
      "title": "锁紧顶板偏心轮",
      "text": "",
      "hardware": [
        {
          "type": "cam",
          "host": "C",
          "count": 6
        }
      ],
      "added": [],
      "ref": "manual-pages/p08.svg",
      "refPage": 8
    },
    {
      "n": 8,
      "title": "钉上背板",
      "text": "沿四边钉，钉在板材边缘中线上。",
      "hardware": [
        {
          "type": "nail",
          "host": "J",
          "count": 18
        }
      ],
      "added": [
        "J"
      ],
      "ref": "manual-pages/p09.svg",
      "refPage": 9
    },
    {
      "n": 9,
      "title": "放上四块层板",
      "text": "层高按书的开本调。",
      "hardware": [],
      "added": [
        "F",
        "G",
        "H",
        "I"
      ],
      "ref": "manual-pages/p10.svg",
      "refPage": 10
    },
    {
      "n": 10,
      "title": "固定到墙上",
      "text": "柜顶装两个固定件，防止倾倒。",
      "hardware": [
        {
          "type": "bracket",
          "host": "C",
          "count": 2
        }
      ],
      "added": [],
      "ref": "manual-pages/p11.svg",
      "refPage": 11,
      "warn": true
    }
  ]
};
