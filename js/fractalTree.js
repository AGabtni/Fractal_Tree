const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('glCanvas') });
renderer.setSize(window.innerWidth, window.innerHeight);



const material = new THREE.MeshLambertMaterial({
    color: 0x964B00,
    emissive: 0x964B00
});
const childMaterial = new THREE.MeshLambertMaterial({
    color: 0xffffff,
    emissive: 0xffffff
});



//---- Input ----

var maxDepth, maxChildren, angle, scaleRatio, trunkLength;

GetInput()

window.onload = function () {
    GetInput()
}

function GetInput() {

    maxDepth = localStorage.getItem("depth") !== null ? localStorage.getItem("depth") : document.getElementById("depth").value;
    maxChildren = localStorage.getItem("childrenNum") !== null ? localStorage.getItem("childrenNum") : document.getElementById("childrenNum").value;
    angle = localStorage.getItem("angle") !== null ? localStorage.getItem("angle") : document.getElementById("angle").value;
    scaleRatio = localStorage.getItem("scaleRatio") !== null ? localStorage.getItem("scaleRatio") : document.getElementById("scaleRatio").value;
    trunkLength = localStorage.getItem("trunkLength") !== null ? localStorage.getItem("trunkLength") : document.getElementById("trunkLength").value;

    document.getElementById("depth").value = maxDepth
    document.getElementById("childrenNum").value = maxChildren
    document.getElementById("angle").value = angle
    document.getElementById("scaleRatio").value = scaleRatio
    document.getElementById("trunkLength").value = trunkLength
}

function OnGenerate() {
    localStorage.setItem("depth", document.getElementById("depth").value);
    localStorage.setItem("childrenNum", document.getElementById("childrenNum").value);
    localStorage.setItem("angle", document.getElementById("angle").value);
    localStorage.setItem("scaleRatio", document.getElementById("scaleRatio").value);
    localStorage.setItem("trunkLength", document.getElementById("trunkLength").value);

    window.location.reload();
}


//---- Camera Setup ----

//Front View
camera.position.z = 400
camera.position.y = 125


//Top View : 
/*
let camAngleX = 90 * (Math.PI / 180);
camera.rotation.x = camAngleX
camera.position.y = -200;
camera.position.x = 1;
*/


const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
raycaster.layers.set(1);

function onPointerMove(event) {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

}

function onPointerClick(event) {

    // update the picking ray with the camera and pointer position
    raycaster.setFromCamera(pointer, camera);

    // calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(scene.children);

    if (intersects.length > 0) {
        AddBranch(intersects[0].object)
    }
}

window.addEventListener('pointermove', onPointerMove);
window.addEventListener('click', onPointerClick);

//---- Game Loop ----
function Update() {
    requestAnimationFrame(Update);

    if (document.getElementById("canRotate").checked)
        RotateGraph(treekTrunk, 0.01)


    renderer.render(scene, camera);
};

function RotateGraph(root, rotSpeed) {
    root.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotSpeed)
    if (root.children.length > 0) {
        root.children.forEach(
            child => {

                RotateGraph(child, rotSpeed)
            }
        )
    }
}

var branchGeometries = []
//Create Branch geometries based on trunk height : 
function InitGeometries(mainBranchHeight, mainBranchGirth) {

    for (let i = 0; i <= maxDepth; i++) {

        let parentBounds = new THREE.Vector3();
        if (i > 0)
            branchGeometries[i - 1].boundingBox.getSize(parentBounds);

        //Scale on Y to fit branches and avoid collision between same depth children facing same X direction
        const height = i == 0 ? mainBranchHeight / 2 : (parentBounds.y / maxChildren) * scaleRatio;

        AddBranchGeometry(mainBranchGirth / 2, height)
    }
}

function AddBranchGeometry(radius, height) {
    const newGeometry = new THREE.CylinderGeometry(radius, radius, height, 5);
    newGeometry.computeBoundingBox();
    branchGeometries.push(newGeometry)
}

function StartFractal(parentMesh, currentDepth, childIndex) {

    let newMesh = parentMesh;
    if (childIndex >= 0) {
        currentDepth = currentDepth + 1;
        let parentSize = GetMeshSize(parentMesh)
        newMesh = InitBranch(parentMesh, childIndex, currentDepth, parentSize.y / maxChildren);

        if (newMesh) parentMesh.add(newMesh)

        newMesh.updateMatrix();
    }

    if (currentDepth < maxDepth) {
        for (let i = 0; i < maxChildren; i++) {
            StartFractal(newMesh, currentDepth, i);
        }
    }
}

// Spawn mesh and initialize new branch on parent
function InitBranch(parentMesh, childIndex, currentDepth, offsetBetweenBranches) {
    let parentSize = GetMeshSize(parentMesh)

    //Get current branch bounding box
    let newMesh = new THREE.Mesh(branchGeometries[currentDepth - 1], childMaterial);
    let newBranchBounds = GetMeshSize(newMesh)
    newMesh.layers.enable(1);


    //Setup Position (Local)
    if (childIndex == 0) {
        newMesh.position.y = offsetBetweenBranches - parentSize.y / 2
    }
    else {
        newMesh.position.y = parentMesh.children[childIndex - 1].position.y + offsetBetweenBranches / 2
    }

    //Setup Rotation (Local)
    let randomXDirection = Math.floor(Math.random() * 2) == 0 ? -1 : 1; // Randomize branch direction
    let angleInRadians = randomXDirection * - 1 * angle * (Math.PI / 180);
    newMesh.rotation.z = angleInRadians;
    newMesh.position.y += Math.cos(angleInRadians) * newBranchBounds.y / 2;
    newMesh.position.x -= Math.sin(angleInRadians) * (newBranchBounds.y / 2);

    return newMesh;
}

//Returns geometry bounding box size
function GetMeshSize(targetMesh) {

    let meshSize = new THREE.Vector3();
    targetMesh.geometry.boundingBox.getSize(meshSize);

    return meshSize;
}

//Find branch's depth
function GetBranchDepth(branch, currentDepth) {

    if (branch.parent.type != "Scene")
        return GetBranchDepth(branch.parent, currentDepth + 1);
    else
        return currentDepth
}

// Add branch to existing branch
function AddBranch(targetMesh) {

    //Add new branch
    const parentMeshSize = GetMeshSize(targetMesh);
    var offset = parentMeshSize.y / maxChildren

    //If depth increase from first time the geometries were generated add a new geometry
    var currentDepth = GetBranchDepth(targetMesh, 0) + 1;
    if (branchGeometries.length < currentDepth) {
        console.log(offset * scaleRatio)

        AddBranchGeometry(.5, offset * scaleRatio)
        console.log(branchGeometries[currentDepth - 1])
    }

    var newBranch = InitBranch(targetMesh, targetMesh.children.length, currentDepth, offset)


    // Extend the length of current mesh 
    if (targetMesh.children.length >= maxChildren) {

        const extensionGeometry = new THREE.CylinderGeometry(parentMeshSize.x / 2, parentMeshSize.x / 2, offset, 5);
        extensionGeometry.computeBoundingBox();
        const extensionMesh = new THREE.Mesh(extensionGeometry, targetMesh.material);
        extensionMesh.position.y = newBranch.position.y - offset;

        targetMesh.add(extensionMesh)
    }
    targetMesh.add(newBranch)
    scene.add(treekTrunk);
}

//--- Start scene ---
const mainBranchGeometry = new THREE.CylinderGeometry(5, 5, maxChildren * trunkLength, 5);
mainBranchGeometry.computeBoundingBox()
const treekTrunk = new THREE.Mesh(mainBranchGeometry, material);
treekTrunk.layers.enable(1);
InitGeometries(200, 2);

//Grab first geometry for trunk
scene.add(treekTrunk);

StartFractal(treekTrunk, 0, -1)

Update();

