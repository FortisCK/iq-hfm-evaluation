// IQ-HFM评价系统核心功能
class IQHFMEvaluation {
    constructor() {
        this.currentCaseIndex = 0;
        this.assignedCases = []; // 随机分配的案例
        this.evaluationData = [];
        this.sessionStartTime = new Date().toISOString();
        // 三个不同的3D查看器
        this.viewers = {
            cbct: { scene: null, camera: null, renderer: null, controls: null, model: null },
            faceScan: { scene: null, camera: null, renderer: null, controls: null, model: null },
            iqhfm: { scene: null, camera: null, renderer: null, controls: null, model: null }
        };
        
        // 所有可用案例（从15个中随机选5个）
        this.allCases = [
            { id: 'subject_001', name: '案例 1' },
            { id: 'subject_002', name: '案例 2' },
            { id: 'subject_003', name: '案例 3' },
            { id: 'subject_004', name: '案例 4' },
            { id: 'subject_005', name: '案例 5' },
            { id: 'subject_006', name: '案例 6' },
            { id: 'subject_007', name: '案例 7' },
            { id: 'subject_008', name: '案例 8' },
            { id: 'subject_009', name: '案例 9' },
            { id: 'subject_010', name: '案例 10' },
            { id: 'subject_011', name: '案例 11' },
            { id: 'subject_012', name: '案例 12' },
            { id: 'subject_013', name: '案例 13' },
            { id: 'subject_014', name: '案例 14' },
            { id: 'subject_015', name: '案例 15' }
        ];
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadEvaluationData();
        
        // 随机分配5个案例
        this.assignRandomCases();
        
        // 直接初始化3D查看器
        this.init3DViewers();
        
        // 加载第一个案例
        this.loadCase(0);
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 评价表单提交
        const ratingForm = document.getElementById('ratingForm');
        if (ratingForm) {
            ratingForm.addEventListener('submit', (e) => this.handleRatingSubmit(e));
        }
        
        // 滑块值更新
        ['geometryAccuracy', 'visualRealism', 'clinicalValue'].forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.addEventListener('input', (e) => this.updateSliderValue(e));
            }
        });
        
        // 下载按钮
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => this.downloadEvaluationData());
        }
        
        // 上一个案例按钮
        const prevBtn = document.getElementById('prevBtn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousCase());
        }
    }
    
    // 随机分配5个案例
    assignRandomCases() {
        // 确保subject_001总是第一个案例
        const subject001 = this.allCases.find(c => c.id === 'subject_001');
        const otherCases = this.allCases.filter(c => c.id !== 'subject_001');
        
        // 随机打乱其他案例
        for (let i = otherCases.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [otherCases[i], otherCases[j]] = [otherCases[j], otherCases[i]];
        }
        
        // 构建最终的案例列表：subject_001 + 其他4个随机案例
        this.assignedCases = [subject001, ...otherCases.slice(0, 4)];
        
        console.log('分配的案例:', this.assignedCases.map(c => c.name));
    }
    

    
    // 初始化3个3D查看器
    init3DViewers() {
        const containers = {
            cbct: document.getElementById('cbctContainer'),
            faceScan: document.getElementById('faceScanContainer'),
            iqhfm: document.getElementById('iqhfmContainer')
        };
        
        // 为每个查看器初始化独立的Three.js场景
        Object.keys(containers).forEach(key => {
            const container = containers[key];
            if (!container) return;
            
            const viewer = this.viewers[key];
            
            // 创建场景
            viewer.scene = new THREE.Scene();
            viewer.scene.background = new THREE.Color(0xf7fafc);
            
            // 创建相机
            const width = container.clientWidth;
            const height = container.clientHeight;
            viewer.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
            viewer.camera.position.set(0, 0, 5);
            
            // 创建渲染器
            viewer.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true
            });
            viewer.renderer.setSize(width, height);
            viewer.renderer.setPixelRatio(window.devicePixelRatio);
            viewer.renderer.shadowMap.enabled = true;
            viewer.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            
            container.appendChild(viewer.renderer.domElement);
            
            // 创建轨道控制器
            viewer.controls = new THREE.OrbitControls(viewer.camera, viewer.renderer.domElement);
            viewer.controls.enableDamping = true;
            viewer.controls.dampingFactor = 0.05;
            viewer.controls.enableZoom = true;
            viewer.controls.enablePan = true; // 启用平移
            
            // 为CBCT设置特殊的控制参数
            if (key === 'cbct') {
                viewer.controls.minDistance = 0.1; // 允许非常近距离观察
                viewer.controls.maxDistance = 50;   // 允许很远距离观察
                console.log(`CBCT controls: minDistance=0.1, maxDistance=50, pan enabled`);
            } else {
                viewer.controls.minDistance = 1;    // 其他模型的标准设置
                viewer.controls.maxDistance = 15;
            }
            
            // 添加光照
            this.setupLighting(viewer.scene);
        });
        
        // 处理窗口大小变化
        window.addEventListener('resize', () => this.onWindowResize());
        
        // 开始渲染循环
        this.animate();
    }
    
    // 设置光照
    setupLighting(scene) {
        // 环境光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        // 主光源
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        scene.add(directionalLight);
        
        // 补光
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-5, 2, -5);
        scene.add(fillLight);
    }
    
    // 窗口大小变化处理
    onWindowResize() {
        const containers = {
            cbct: document.getElementById('cbctContainer'),
            faceScan: document.getElementById('faceScanContainer'),
            iqhfm: document.getElementById('iqhfmContainer')
        };
        
        Object.keys(containers).forEach(key => {
            const container = containers[key];
            const viewer = this.viewers[key];
            
            if (!container || !viewer.camera || !viewer.renderer) return;
            
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            viewer.camera.aspect = width / height;
            viewer.camera.updateProjectionMatrix();
            viewer.renderer.setSize(width, height);
        });
    }
    
    // 动画循环
    animate() {
        requestAnimationFrame(() => this.animate());
        
        // 更新所有查看器
        Object.keys(this.viewers).forEach(key => {
            const viewer = this.viewers[key];
            
            if (viewer.controls) {
                viewer.controls.update();
            }
            
            if (viewer.renderer && viewer.scene && viewer.camera) {
                viewer.renderer.render(viewer.scene, viewer.camera);
            }
        });
    }
    
    // 加载案例
    loadCase(index) {
        if (index < 0 || index >= this.assignedCases.length) return;
        
        this.currentCaseIndex = index;
        const currentCase = this.assignedCases[index];
        
        // 更新UI
        this.updateCaseUI(currentCase, index);
        
        // 加载3个不同的3D模型
        this.load3DModels(currentCase.id);
        
        // 重置表单
        this.resetEvaluationForm();
        
        // 更新进度条
        this.updateProgress(index + 1, this.assignedCases.length);
    }
    
    // 更新案例UI
    updateCaseUI(currentCase, index) {
        const title = document.getElementById('caseTitle');
        if (title) {
            title.textContent = currentCase.name;
        }
        
        // 显示/隐藏上一个按钮
        const prevBtn = document.getElementById('prevBtn');
        if (prevBtn) {
            prevBtn.style.display = index > 0 ? 'block' : 'none';
        }
        
        // 更新提交按钮文字
        const submitBtn = document.getElementById('submitBtn');
        if (submitBtn) {
            const isLast = index === this.assignedCases.length - 1;
            submitBtn.textContent = isLast ? '完成评价' : '下一个案例';
        }
    }
    
    // 加载3个不同的3D模型
    load3DModels(caseId) {
        const modelTypes = {
            cbct: { 
                objPath: `models/${caseId}_cbct.obj`, 
                color: 0xffffff, 
                format: 'obj',
                hasMaterial: false
            },
            faceScan: { 
                objPath: `models/${caseId}_3dmd.obj`, 
                color: 0xffdbac, 
                format: 'obj',
                hasMaterial: true
            },
            iqhfm: { 
                objPath: `models/${caseId}_iqhfm.ply`, 
                color: 0xffdbac, 
                format: 'ply',
                hasMaterial: false
            }
        };
        
        Object.keys(modelTypes).forEach(viewerKey => {
            this.loadSingleModel(viewerKey, modelTypes[viewerKey]);
        });
    }
    
    // 加载单个模型
    loadSingleModel(viewerKey, modelInfo) {
        const viewer = this.viewers[viewerKey];
        
        // 移除当前模型
        if (viewer.model) {
            viewer.scene.remove(viewer.model);
            viewer.model = null;
        }
        
        // 显示加载提示
        this.showLoadingIndicator(viewerKey, true);
        
        // 根据格式选择加载器
        if (modelInfo.format === 'ply') {
            this.loadPLYModel(viewerKey, modelInfo);
        } else if (modelInfo.hasMaterial) {
            this.loadOBJWithMaterial(viewerKey, modelInfo);
        } else {
            this.loadSimpleOBJ(viewerKey, modelInfo);
        }
    }
    
    // 加载PLY模型
    loadPLYModel(viewerKey, modelInfo) {
        const loader = new THREE.PLYLoader();
        loader.load(
            modelInfo.objPath,
            (geometry) => {
                // 计算法向量（如果没有的话）
                if (!geometry.attributes.normal) {
                    geometry.computeVertexNormals();
                }
                
                // 检查PLY文件的所有属性
                const attributes = Object.keys(geometry.attributes);
                console.log(`PLY geometry attributes:`, attributes);
                console.log(`PLY vertices count:`, geometry.attributes.position.count);
                
                // 检查各种可能的颜色属性
                const hasColor = geometry.attributes.color !== undefined;
                const hasRGB = geometry.attributes.red !== undefined && geometry.attributes.green !== undefined && geometry.attributes.blue !== undefined;
                const hasVertexColors = hasColor || hasRGB;
                
                console.log(`PLY color info - hasColor: ${hasColor}, hasRGB: ${hasRGB}, hasVertexColors: ${hasVertexColors}`);
                
                this.onPLYModelLoaded(viewerKey, geometry, modelInfo.color, hasVertexColors);
            },
            (progress) => {
                console.log(`Loading ${viewerKey} PLY progress:`, (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.warn(`Failed to load ${viewerKey} PLY model:`, error);
                this.loadPlaceholderModel(viewerKey, modelInfo.color);
            }
        );
    }
    
    // 专门处理PLY模型加载
    onPLYModelLoaded(viewerKey, geometry, defaultColor, hasVertexColors) {
        const viewer = this.viewers[viewerKey];
        this.showLoadingIndicator(viewerKey, false);
        
        // 如果有分开的RGB属性，合并成color属性
        if (geometry.attributes.red && geometry.attributes.green && geometry.attributes.blue && !geometry.attributes.color) {
            const vertexCount = geometry.attributes.position.count;
            const colors = new Float32Array(vertexCount * 3);
            
            for (let i = 0; i < vertexCount; i++) {
                colors[i * 3] = geometry.attributes.red.array[i] / 255; // 红色分量
                colors[i * 3 + 1] = geometry.attributes.green.array[i] / 255; // 绿色分量
                colors[i * 3 + 2] = geometry.attributes.blue.array[i] / 255; // 蓝色分量
            }
            
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            hasVertexColors = true;
            console.log('合并RGB属性为color属性');
        }
        
        let material;
        
        if (hasVertexColors) {
            // 如果PLY有顶点颜色，使用顶点颜色
            material = new THREE.MeshLambertMaterial({
                vertexColors: true,
                side: THREE.DoubleSide
            });
        } else {
            // 如果没有顶点颜色，使用默认颜色
            material = new THREE.MeshLambertMaterial({
                color: defaultColor,
                side: THREE.DoubleSide
            });
        }
        
        const modelObject = new THREE.Mesh(geometry, material);
        modelObject.castShadow = true;
        modelObject.receiveShadow = true;
        
        // 居中和缩放模型
        const box = new THREE.Box3().setFromObject(modelObject);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        modelObject.position.sub(center);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        // 为CBCT模型设置更大的缩放比例
        let scale;
        if (viewerKey === 'cbct') {
            scale = 12 / maxDim; // CBCT模型放大到原来的4倍
            console.log(`CBCT PLY model scale increased to 4x: ${scale}`);
        } else {
            scale = 3 / maxDim; // 其他模型保持原来的缩放
        }
        modelObject.scale.setScalar(scale);
        
        viewer.model = modelObject;
        viewer.scene.add(modelObject);
        
        // 根据模型类型设置不同的相机位置
        if (viewerKey === 'cbct') {
            // 使用固定的CBCT质心坐标，避免动态计算提高性能
            const cbctCenter = new THREE.Vector3(2.65, 14.21, 2.30);
            console.log(`Using fixed CBCT model center: (${cbctCenter.x}, ${cbctCenter.y}, ${cbctCenter.z})`);
            this.setCameraPosition(viewerKey, viewer.camera, viewer.controls, cbctCenter);
        } else {
            // 3dMD和IQ-HFM保持原来的(0,0,0)设置
            this.setCameraPosition(viewerKey, viewer.camera, viewer.controls);
        }
        
        console.log(`${viewerKey} PLY model loaded successfully (${hasVertexColors ? 'with vertex colors' : 'with default color'})`);
    }
    
    // 根据模型类型设置相机位置
    setCameraPosition(viewerKey, camera, controls, modelCenter = null) {
        console.log(`Setting camera position for ${viewerKey}`);
        
        // 使用模型真实中心，如果没有提供则使用原点
        const target = modelCenter || new THREE.Vector3(0, 0, 0);
        
        // 先重置controls，然后再设置相机位置
        controls.reset();
        
        if (viewerKey === 'cbct') {
            // CBCT需要从下往上的视角
            // 把相机放在模型的下方，距离更远，向上看
            camera.position.set(target.x, target.y - 15, target.z - 8); // 增加距离：Y轴从-5改为-10，Z轴从-2改为-4
            camera.up.set(0, 0, 1); // Z轴向上
            camera.lookAt(target.x, target.y, target.z + 1); // 看向模型中心偏上一点
            
            // 设置controls的目标
            controls.target.copy(target);
            controls.update();
            
            console.log(`CBCT camera positioned at: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}) looking at target: (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`);
        } else {
            // 3dMD和IQ-HFM使用相同的相机位置，相对于模型中心，距离更近
            const cameraOffset = new THREE.Vector3(0, 0, 3);
            const cameraPosition = target.clone().add(cameraOffset);
            
            camera.position.copy(cameraPosition);
            camera.lookAt(target);
            camera.up.set(0, 1, 0);
            
            // 设置controls的目标为模型的真实中心
            controls.target.copy(target);
            controls.object.position.copy(camera.position);
            controls.update();
            
            console.log(`${viewerKey} camera set to position: (${cameraPosition.x.toFixed(2)}, ${cameraPosition.y.toFixed(2)}, ${cameraPosition.z.toFixed(2)}) looking at model center (${target.x.toFixed(2)}, ${target.y.toFixed(2)}, ${target.z.toFixed(2)})`);
        }
    }
    
    // 加载带材质的OBJ文件
    loadOBJWithMaterial(viewerKey, modelInfo) {
        const mtlLoader = new THREE.MTLLoader();
        
        // 设置材质文件和纹理文件的基础路径
        mtlLoader.setPath('models/');
        
        // 设置纹理加载器路径（确保PNG文件能正确加载）
        mtlLoader.setResourcePath('models/');
        
        mtlLoader.load('aligned_model.mtl', (materials) => {
            console.log('MTL materials loaded:', materials);
            
            // 强制设置纹理路径
            const materialNames = Object.keys(materials.materials);
            materialNames.forEach(name => {
                const material = materials.materials[name];
                if (material.map && material.map.image && material.map.image.src) {
                    console.log(`Material ${name} texture path:`, material.map.image.src);
                }
            });
            
            materials.preload();
            
            const objLoader = new THREE.OBJLoader();
            objLoader.setMaterials(materials);
            
            objLoader.load(
                modelInfo.objPath,
                (object) => {
                    console.log(`3dMD model loaded with materials`);
                    this.onModelLoaded(viewerKey, object, modelInfo.color, 'obj');
                },
                (progress) => {
                    console.log(`Loading ${viewerKey} OBJ with material progress:`, (progress.loaded / progress.total * 100) + '%');
                },
                (error) => {
                    console.warn(`Failed to load ${viewerKey} OBJ with material:`, error);
                    // 如果MTL加载失败，尝试简单OBJ加载
                    this.loadSimpleOBJ(viewerKey, modelInfo);
                }
            );
        }, (progress) => {
            console.log('MTL loading progress:', progress);
        }, (error) => {
            console.warn(`Failed to load MTL file:`, error);
            // 如果MTL文件加载失败，直接加载OBJ
            this.loadSimpleOBJ(viewerKey, modelInfo);
        });
    }
    
    // 加载简单OBJ文件（无材质）
    loadSimpleOBJ(viewerKey, modelInfo) {
        const loader = new THREE.OBJLoader();
        
        loader.load(
            modelInfo.objPath,
            (object) => {
                this.onModelLoaded(viewerKey, object, modelInfo.color, 'obj');
            },
            (progress) => {
                console.log(`Loading ${viewerKey} simple OBJ progress:`, (progress.loaded / progress.total * 100) + '%');
            },
            (error) => {
                console.warn(`Failed to load ${viewerKey} simple OBJ:`, error);
                this.loadPlaceholderModel(viewerKey, modelInfo.color);
            }
        );
    }
    
    // OBJ模型加载成功处理
    onModelLoaded(viewerKey, loadedData, color, format) {
        const viewer = this.viewers[viewerKey];
        this.showLoadingIndicator(viewerKey, false);
        
        // 这个方法现在只处理OBJ格式，PLY格式由onPLYModelLoaded处理
        const modelObject = loadedData;
        
        // 检查是否已经有材质（来自MTL文件）
        let hasMaterial = false;
        modelObject.traverse((child) => {
            if (child.isMesh && child.material) {
                console.log(`Checking material for ${viewerKey}:`, {
                    hasMap: !!child.material.map,
                    mapSrc: child.material.map ? child.material.map.image.src : 'none',
                    color: child.material.color,
                    materialType: child.material.type
                });
                
                // 如果有纹理贴图，认为有材质
                if (child.material.map) {
                    hasMaterial = true;
                    console.log(`Found texture material for ${viewerKey}`);
                }
            }
        });
        
        // 如果没有材质或材质加载失败，设置默认材质
        if (!hasMaterial) {
            modelObject.traverse((child) => {
                if (child.isMesh) {
                    child.material = new THREE.MeshLambertMaterial({
                        color: color,
                        side: THREE.DoubleSide
                    });
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        } else {
            // 如果有材质，确保阴影设置正确
            modelObject.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });
        }
        
        // 居中和缩放模型
        const box = new THREE.Box3().setFromObject(modelObject);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        modelObject.position.sub(center);
        
        const maxDim = Math.max(size.x, size.y, size.z);
        // 为CBCT模型设置更大的缩放比例
        let scale;
        if (viewerKey === 'cbct') {
            scale = 12 / maxDim; // CBCT模型放大到原来的4倍
            console.log(`CBCT OBJ model scale increased to 4x: ${scale}`);
        } else {
            scale = 3 / maxDim; // 其他模型保持原来的缩放
        }
        modelObject.scale.setScalar(scale);
        
        viewer.model = modelObject;
        viewer.scene.add(modelObject);
        
        // 根据模型类型设置不同的相机位置
        if (viewerKey === 'cbct') {
            // 使用固定的CBCT质心坐标，避免动态计算提高性能
            const cbctCenter = new THREE.Vector3(2.65, 14.21, 2.30);
            console.log(`Using fixed CBCT model center: (${cbctCenter.x}, ${cbctCenter.y}, ${cbctCenter.z})`);
            this.setCameraPosition(viewerKey, viewer.camera, viewer.controls, cbctCenter);
        } else {
            // 3dMD和IQ-HFM保持原来的(0,0,0)设置
            this.setCameraPosition(viewerKey, viewer.camera, viewer.controls);
        }
        
        console.log(`${viewerKey} OBJ model loaded successfully (${hasMaterial ? 'with MTL material' : 'with default material'})`);
    }
    

    
    // 加载占位模型（当OBJ文件不存在时）
    loadPlaceholderModel(viewerKey, color) {
        const viewer = this.viewers[viewerKey];
        this.showLoadingIndicator(viewerKey, false);
        
        // 根据不同类型创建不同的占位模型
        let placeholder;
        
        if (viewerKey === 'cbct') {
            // CBCT占位模型：简单的骨骼状结构（放大4倍以匹配实际CBCT模型）
            const geometry = new THREE.BoxGeometry(8, 10, 6); // 放大4倍
            const material = new THREE.MeshLambertMaterial({ 
                color: color, 
                transparent: true, 
                opacity: 0.8,
                wireframe: true 
            });
            placeholder = new THREE.Mesh(geometry, material);
        } else {
            // 人脸占位模型：球形头部
            const geometry = new THREE.SphereGeometry(1.2, 32, 16);
            const material = new THREE.MeshLambertMaterial({ color: color });
            placeholder = new THREE.Mesh(geometry, material);
            
            // 添加眼睛细节
            const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
            const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
            
            const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            leftEye.position.set(-0.3, 0.2, 1.0);
            placeholder.add(leftEye);
            
            const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
            rightEye.position.set(0.3, 0.2, 1.0);
            placeholder.add(rightEye);
        }
        
        viewer.model = placeholder;
        viewer.scene.add(placeholder);
        
        // 重置相机位置
        viewer.camera.position.set(0, 0, 5);
        viewer.controls.reset();
    }
    
    // 显示/隐藏加载指示器
    showLoadingIndicator(viewerKey, show) {
        const containerIds = {
            cbct: 'cbctContainer',
            faceScan: 'faceScanContainer',
            iqhfm: 'iqhfmContainer'
        };
        
        const container = document.getElementById(containerIds[viewerKey]);
        if (!container) return;
        
        let indicator = container.querySelector('.loading-indicator');
        
        const loadingTexts = {
            cbct: '正在加载CBCT模型...',
            faceScan: '正在加载3dMD扫描...',
            iqhfm: '正在加载IQ-HFM模型...'
        };
        
        if (show && !indicator) {
            indicator = document.createElement('div');
            indicator.className = 'loading-indicator';
            indicator.innerHTML = `
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); 
                            background: rgba(102, 126, 234, 0.9); color: white; padding: 10px 20px; 
                            border-radius: 8px; font-weight: 500; text-align: center; font-size: 0.9em;">
                    ${loadingTexts[viewerKey]}
                </div>
            `;
            container.appendChild(indicator);
        } else if (!show && indicator) {
            indicator.remove();
        }
    }
    

    
    // 重置评价表单
    resetEvaluationForm() {
        const form = document.getElementById('ratingForm');
        if (!form) return;
        
        // 重置滑块
        ['geometryAccuracy', 'visualRealism', 'clinicalValue'].forEach(id => {
            const slider = document.getElementById(id);
            if (slider) {
                slider.value = 3;
                this.updateSliderValue({ target: slider });
            }
        });
        
        // 重置复选框
        ['diagnostic', 'communication', 'planning'].forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.checked = false;
            }
        });
        
        // 重置评论
        const comments = document.getElementById('comments');
        if (comments) {
            comments.value = '';
        }
    }
    
    // 更新滑块显示值
    updateSliderValue(e) {
        const slider = e.target;
        const valueElement = document.getElementById(slider.id.replace(/([A-Z])/g, (match, p1, offset) => 
            offset > 0 ? '-' + p1.toLowerCase() : p1.toLowerCase()
        ) + '-value');
        
        // 简化映射
        const valueMap = {
            'geometry-accuracy-value': 'gaValue',
            'visual-realism-value': 'vrValue', 
            'clinical-value-value': 'cvValue'
        };
        
        const actualId = valueMap[valueElement?.id] || slider.id.replace('geometryAccuracy', 'ga').replace('visualRealism', 'vr').replace('clinicalValue', 'cv') + 'Value';
        const actualElement = document.getElementById(actualId);
        
        if (actualElement) {
            actualElement.textContent = slider.value;
        }
    }
    
    // 处理评价表单提交
    handleRatingSubmit(e) {
        e.preventDefault();
        
        const formData = this.getFormData();
        if (!this.validateFormData(formData)) {
            return;
        }
        
        // 保存当前案例的评价
        this.saveEvaluation(formData);
        
        // 检查是否是最后一个案例
        if (this.currentCaseIndex >= this.assignedCases.length - 1) {
            // 完成所有评价
            this.completeEvaluation();
        } else {
            // 加载下一个案例
            this.loadCase(this.currentCaseIndex + 1);
        }
    }
    
    // 获取表单数据
    getFormData() {
        const clinicalExperience = document.getElementById('clinicalExperience')?.value || '';
        const ga = document.getElementById('geometryAccuracy')?.value || 3;
        const vr = document.getElementById('visualRealism')?.value || 3;
        const cv = document.getElementById('clinicalValue')?.value || 3;
        
        const diagnostic = document.getElementById('diagnostic')?.checked || false;
        const communication = document.getElementById('communication')?.checked || false;
        const planning = document.getElementById('planning')?.checked || false;
        
        const comments = document.getElementById('comments')?.value || '';
        
        return {
            clinicalExperience: parseInt(clinicalExperience) || 0,
            caseId: this.assignedCases[this.currentCaseIndex].id,
            caseName: this.assignedCases[this.currentCaseIndex].name,
            geometryAccuracy: parseInt(ga),
            visualRealism: parseInt(vr),
            clinicalValue: parseInt(cv),
            diagnostic,
            communication,
            planning,
            comments: comments.trim(),
            evaluationTime: new Date().toISOString(),
            timeSpent: this.getTimeSpent()
        };
    }
    
    // 验证表单数据
    validateFormData(data) {
        if (!data.clinicalExperience || data.clinicalExperience < 1) {
            alert('请填写临床经验年数');
            return false;
        }
        
        if (data.geometryAccuracy < 1 || data.geometryAccuracy > 5 ||
            data.visualRealism < 1 || data.visualRealism > 5 ||
            data.clinicalValue < 1 || data.clinicalValue > 5) {
            alert('请确保所有评分都在1-5范围内');
            return false;
        }
        
        return true;
    }
    
    // 保存单个评价
    saveEvaluation(formData) {
        const evaluation = {
            sessionId: this.sessionStartTime,
            caseIndex: this.currentCaseIndex + 1,
            ...formData
        };
        
        this.evaluationData.push(evaluation);
        
        // 保存到本地存储
        this.saveToLocalStorage();
        
        console.log('评价已保存:', evaluation);
    }
    
    // 获取评价耗时
    getTimeSpent() {
        // 这里可以实现更精确的时间跟踪
        return Math.floor(Math.random() * 300) + 60; // 模拟60-360秒
    }
    
    // 上一个案例
    previousCase() {
        if (this.currentCaseIndex > 0) {
            this.loadCase(this.currentCaseIndex - 1);
        }
    }
    
    // 更新进度条
    updateProgress(current, total) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
        if (progressBar) {
            const percentage = (current / total) * 100;
            progressBar.style.width = `${percentage}%`;
        }
        
        if (progressText) {
            progressText.textContent = `案例 ${current} / ${total}`;
        }
    }
    
    // 完成评价
    completeEvaluation() {
        // 隐藏评价区域，显示完成页面
        document.getElementById('evaluationArea').style.display = 'none';
        document.getElementById('completionArea').style.display = 'block';
        
        // 更新进度条为100%
        this.updateProgress(this.assignedCases.length, this.assignedCases.length);
        
        console.log('所有评价已完成:', this.evaluationData);
    }
    
    // 保存到本地存储
    saveToLocalStorage() {
        const allData = this.loadFromLocalStorage() || [];
        
        // 移除当前会话的旧数据
        const filteredData = allData.filter(item => item.sessionId !== this.sessionStartTime);
        
        // 添加当前会话的新数据
        const updatedData = [...filteredData, ...this.evaluationData];
        
        localStorage.setItem('iqhfm_evaluation_data', JSON.stringify(updatedData));
    }
    
    // 从本地存储加载
    loadFromLocalStorage() {
        const data = localStorage.getItem('iqhfm_evaluation_data');
        return data ? JSON.parse(data) : [];
    }
    
    // 加载已有评价数据
    loadEvaluationData() {
        const storedData = this.loadFromLocalStorage();
        console.log('已加载的评价数据:', storedData);
    }
    
    // 下载评价数据
    downloadEvaluationData() {
        const allData = this.loadFromLocalStorage();
        
        if (allData.length === 0) {
            alert('没有可下载的评价数据');
            return;
        }
        
        const dataStr = JSON.stringify(allData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `iqhfm_evaluation_data_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        console.log('数据已下载');
    }
}

// 初始化系统
document.addEventListener('DOMContentLoaded', () => {
    window.evaluationSystem = new IQHFMEvaluation();
}); 