const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const dir = path.join(__dirname, 'dist');
const frontend = path.resolve(__dirname, '../..');
webpack({ mode:'development', devtool:false, context:frontend, entry:path.join(__dirname,'index.jsx'),
  output:{path:dir,filename:'preview.js'},
  resolve:{extensions:['.js','.jsx'],modules:[path.join(frontend,'node_modules'),'node_modules']},
  module:{rules:[{test:/\.jsx?$/,exclude:/node_modules/,use:{loader:require.resolve('babel-loader'),options:{babelrc:false,configFile:false,presets:[require.resolve('@babel/preset-react')]}}},{test:/\.css$/,use:[require.resolve('style-loader'),require.resolve('css-loader')]}]},
  plugins:[new webpack.DefinePlugin({'process.env.REACT_APP_PARTNER_SERENO':JSON.stringify('false'),'process.env.REACT_APP_BACKEND_URL':JSON.stringify('')})],
},(err,stats)=>{
  if(err || stats.hasErrors()){console.error(err || stats.toString({all:false,errors:true}));process.exitCode=1;return;}
  fs.mkdirSync(path.join(dir,'ciak'),{recursive:true});
  fs.copyFileSync(path.join(frontend,'public/ciak/logo.webp'),path.join(dir,'ciak/logo.webp'));
  fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ciak — Anteprima percorso partner</title><link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap" rel="stylesheet"><style>body{margin:0}</style></head><body><div id="root"></div><script src="/preview.js"></script></body></html>');
  console.log(stats.toString({all:false,assets:true,errors:true,warnings:true}));
});
