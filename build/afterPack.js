import fs from 'node:fs';
import path from 'node:path';

// electron-builder Arch 枚举值：ia32=0, x64=1, arm64=3, universal=4
const ARCH_X64 = 1;
const ARCH_ARM64 = 3;

/**
 * mac 双架构构建时（--x64 --arm64 或 --universal），api/bin 里会同时存在
 * Intel 与 Apple Silicon 两个 api 二进制。按当前构建架构裁掉用不到的那份，
 * 避免每个 arch 的安装包都白背一份 ~45MB 的另一架构二进制。
 * universal 构建保留两份，运行时由 electron/appServices.js 按 process.arch 挑选。
 */
export default async function afterPack(context) {
    if (context.electronPlatformName !== 'darwin') return;

    const productName = context.packager.appInfo.productName;
    const apiDir = path.join(context.appOutDir, `${productName}.app`, 'Contents', 'api');
    if (!fs.existsSync(apiDir)) return;

    if (context.arch === ARCH_X64) {
        fs.rmSync(path.join(apiDir, 'app_macos_arm64'), { force: true });
    } else if (context.arch === ARCH_ARM64) {
        fs.rmSync(path.join(apiDir, 'app_macos'), { force: true });
    }
}
