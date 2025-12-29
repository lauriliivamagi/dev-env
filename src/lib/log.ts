import { bold, cyan, dim, green, red, yellow } from "@std/fmt/colors";

export function info(msg: string): void {
  console.log(cyan("INFO"), msg);
}

export function success(msg: string): void {
  console.log(green("OK"), msg);
}

export function warn(msg: string): void {
  console.log(yellow("WARN"), msg);
}

export function error(msg: string): void {
  console.log(red("ERROR"), msg);
}

export function dryRun(msg: string): void {
  console.log(dim("[DRY_RUN]"), msg);
}

export function task(name: string): void {
  console.log(bold(cyan(`\n=== ${name} ===`)));
}

export function cmd(command: string[]): void {
  console.log(dim("$"), command.join(" "));
}
