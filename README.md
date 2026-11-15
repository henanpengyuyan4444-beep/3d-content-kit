# 3D 内容工厂

把两类内容变成能点的 3D。两条线共用一套技术底座（three.js + 数据驱动 + 编译成静态页 + 手机优先），输出都是双击就能打开、也能嵌到网页或小程序里的页面。

| 线 | 输入 | 输出 | 适合谁 |
| --- | --- | --- | --- |
| **说明书线** `skills/manual3d-build` | 零件表 + 步骤 + 原页图（或一本手册） | 逐步 3D 装配演示，每步带零件、五金、原页对照 | 家具、货架、器材品牌 |
| **店铺线** `skills/space3d-viewer` | 一张 360 全景图 + 热点表 | 可拖可点的看店页面，热点带说明与价格 | 餐饮、零售、展厅、民宿 |

## 先看演示

打开根目录的 `index.html`，两张卡片分别进两个示例。示例都是离线可跑的静态页。

- 说明书示例：10 步书柜，含 6 张自绘原页图
- 店铺示例：咖啡店全景（Poly Haven CC0），4 个热点

## 怎么用

两条线各是一个 skill，目录里都有 `SKILL.md` 和 `scripts/build.mjs`：

```bash
# 说明书
cd skills/manual3d-build
python scripts/check_sku.py fixtures/demo-sku.json     # 五条硬门槛
node scripts/build.mjs fixtures/demo-sku.json --out ../../demos/manual

# 店铺
cd skills/space3d-viewer
node scripts/build.mjs fixtures/cafe/space.json --out ../../demos/shop
```

产物在 `<out>/<slug>/index.html`，双击即开。

## 需要客户给什么

- **说明书线**：手册照片/PDF + 成品尺寸；愿意填表的话给零件表与步骤表，工期减半。详见 `skills/manual3d-build/references/输入清单.md`。
- **店铺线**：一张手机全景（系统相机全景模式，转一圈）+ 想标的位置。详见 `skills/space3d-viewer/references/拍摄与标注.md`。

## 质量门槛

说明书线有五条硬检查（零件完整、竖板数量、层板不被劈半、引用闭合、页映射一致），不过在 `check_sku.py` 里就别生成。

店铺线的检查是人工的：接缝、亮度、热点是否落在物体上、手机能否单手操作。

## 边界

- 说明书线：零件是按尺寸生成的几何体，不是真实外观；五金位置是示意；尺寸按手册推算，不做开料图纸。
- 店铺线：是 360 环视 + 热点，不是真 3D，不能走动、不能绕到物体背后。
- 两条线都不含任何厂商的说明书或图纸；示例页为自绘。

## 目录

```
index.html                 演示入口
demos/manual/<slug>/       说明书示例成品
demos/shop/<slug>/         看店示例成品
skills/manual3d-build/     说明书 skill（引擎、脚本、样例、文档）
skills/space3d-viewer/     看店 skill（引擎、脚本、样例、文档）
images/                    首页配图
```

## 许可

代码 MIT，见 [LICENSE](LICENSE)。第三方素材与商标说明见 [NOTICE](NOTICE)。
