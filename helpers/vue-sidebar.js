'use strict';

// create vuepress sidebar
module.exports = ({ fileTree, codeFolder, title }) => {
  let rootFiles = [['', '::vuepress-jsdoc-title::']];
  rootFiles = rootFiles.concat(fileTree.filter(file => !file.children).map(file => file.name));

  let rootFolder = fileTree.filter(file => file.children && file.children.length > 0);

  function buildChildren(children, name, depth) {
    let newChildren = [];

    children.forEach(child => {
      if (child.children && child.children.length > 0) {
        newChildren = newChildren.concat(buildChildren(child.children, child.name, depth + 1));
      } else if (child.fullPath) {
        newChildren.push(child.fullPath);
      }
    });

    return newChildren;
  }

  const tree = rootFolder.map(folder => ({
    title: folder.name.charAt(0).toUpperCase() + folder.name.slice(1),
    collapsable: true,
    children: buildChildren(folder.children, folder.name, 0)
  }));

  return {
    [`/${codeFolder}/`]: [
      {
        collapsable: false,  
        children: rootFiles
      }
    ].concat(tree)
  };
};
