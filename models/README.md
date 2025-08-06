# 3D模型文件目录

将您的OBJ格式3D模型文件放在这里，每个案例需要3个模型文件：

## CBCT重建模型
- `subject_001_cbct.obj` - 案例1的纯CBCT重建模型
- `subject_002_cbct.obj` - 案例2的纯CBCT重建模型
- ...
- `subject_015_cbct.obj` - 案例15的纯CBCT重建模型

## 3dMD真实扫描
- `subject_001_3dmd.obj` - 案例1的真实面部3dMD扫描
- `subject_002_3dmd.obj` - 案例2的真实面部3dMD扫描  
- ...
- `subject_015_3dmd.obj` - 案例15的真实面部3dMD扫描

## IQ-HFM重建结果
- `subject_001_iqhfm.obj` - 案例1的IQ-HFM跨模态重建模型
- `subject_002_iqhfm.obj` - 案例2的IQ-HFM跨模态重建模型
- ...
- `subject_015_iqhfm.obj` - 案例15的IQ-HFM跨模态重建模型

## 文件要求

- **格式**：OBJ格式
- **大小**：建议每个文件不超过5MB
- **内容**：
  - CBCT模型：仅基于CBCT数据的3D重建
  - 3dMD模型：真实面部的高精度3D扫描
  - IQ-HFM模型：融合CBCT和2D照片的跨模态重建结果
- **命名**：严格按照 `subject_XXX_type.obj` 格式命名

## 显示特点

1. **CBCT模型**：显示为白色，可能带有线框效果
2. **3dMD模型**：显示为自然肤色
3. **IQ-HFM模型**：显示为自然肤色
4. 系统会从15个案例中为每位专家随机分配5个
5. 如果模型文件不存在，会显示对应类型的占位模型
6. 所有模型支持鼠标拖拽旋转和滚轮缩放
