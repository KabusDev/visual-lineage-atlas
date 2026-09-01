import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyGeneratedExpansions, expandStoredDatasets } from './atlas-expansions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const verifiedOn = '2026-09-01';

const source = (id, label, url, note) => ({id, label, url, note});
const node = (id, name, year, type, lineage, parent, note, hook, tags, sourceIds, status = 'released') => ({
  id, name, year, type, lineage, parent, ...(parent === 'root' || type === 'family' ? {branch: true} : {}),
  note, hook, tags, sourceIds, verifiedOn, status
});

function buildDataset({id, title, description, ui, presets, sources, nodes, links = []}){
  const edges = nodes.filter(item => item.parent).map(item => ({
    source: item.parent,
    target: item.id,
    type: item.parent === 'root' || item.type === 'family' ? 'branch' : 'successor',
    strength: 1
  }));
  for(const [edgeSource, target, type, note] of links){
    edges.push({source: edgeSource, target, type, strength: 0.72, ...(note ? {note} : {})});
  }
  return {schemaVersion: 1, citationMode: 'referenced', id, title, description, ui, curriculumPresets: presets, sources, nodes, edges};
}

const commonUi = (family, item, branch, related) => ({
  typeLabels: {root: 'Atlas', family, engine: item, sourcePort: branch, mod: 'Extension', tool: related},
  groupLabels: {family: `${family}s`, engine: `${item}s`, game: 'Case studies', portmod: `${branch}s`, tool: `${related}s`, esports: 'Highlighted'}
});

const programming = buildDataset({
  id: 'programming-languages',
  title: 'Programming Language Release Atlas',
  description: 'Selected language and platform release lines, editions and standards. Dates describe public releases or standard editions, not direct code inheritance.',
  ui: commonUi('Language family', 'Release / edition', 'Related branch', 'Runtime / platform'),
  presets: [
    {id:'all', title:'Full programming atlas', description:'Compare release cadence, language editions, runtimes and standardisation models across the complete map.', tag:'all', view:'timeline'},
    {id:'software-dev', title:'Software development choices', description:'Compare current Python, C#, Java, TypeScript, Rust, Go, Kotlin, PHP and Swift lines. Justify a language choice using purpose, ecosystem and support status.', tag:'current', view:'layered'},
    {id:'standards', title:'Standards versus implementations', description:'Contrast ISO C and C++ editions, Java/OpenJDK releases and vendor-led languages. Explain why a standard and an implementation are not interchangeable.', tag:'standards', view:'timeline'},
    {id:'web-stack', title:'Web programming stack', description:'Trace JavaScript, TypeScript and PHP releases, then identify which code executes in a browser, server or build tool.', tag:'web', view:'force'},
    {id:'systems', title:'Systems programming', description:'Compare the C, C++, Rust and Go branches. Investigate memory safety, concurrency and compatibility without assuming newer means suitable for every task.', tag:'systems', view:'radial'}
  ],
  sources: [
    source('python-history','Python documentation: What’s New index','https://docs.python.org/3/whatsnew/index.html','Primary index for Python release histories.'),
    source('python-3147','Python 3.14.7 release','https://www.python.org/downloads/release/python-3147/','Current Python 3.14 maintenance release checked 2026-09-01.'),
    source('python-315rc1','Python 3.15.0rc1 release','https://www.python.org/downloads/release/python-3150rc1/','Pre-release milestone, not a final release.'),
    source('java-history','OpenJDK JDK Project','https://openjdk.org/projects/jdk/','Primary OpenJDK release-project index.'),
    source('jdk26','OpenJDK JDK 26','https://openjdk.org/projects/jdk/26/','JDK 26 reached general availability on 2026-03-17.'),
    source('jdk27','OpenJDK JDK 27','https://openjdk.org/projects/jdk/27/','JDK 27 release-candidate project status checked 2026-09-01.'),
    source('csharp-history','Microsoft: C# language version history','https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-version-history','Primary Microsoft language-version history.'),
    source('csharp14','Microsoft: What’s new in C# 14','https://learn.microsoft.com/en-us/dotnet/csharp/whats-new/csharp-14','C# 14 is supported on .NET 10.'),
    source('ecma262','Ecma TC39: ECMAScript','https://tc39.es/ecma262/','Current ECMAScript language specification.'),
    source('ts-history','TypeScript release notes','https://www.typescriptlang.org/docs/handbook/release-notes/overview.html','Primary TypeScript version index.'),
    source('ts6','Microsoft: Announcing TypeScript 6.0','https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/','TypeScript 6.0 release announcement, 2026-03-23.'),
    source('ts7','Microsoft: Announcing TypeScript 7.0','https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/','TypeScript 7.0 release announcement, 2026-07-08.'),
    source('rust-history','Rust release notes','https://doc.rust-lang.org/stable/releases.html','Primary Rust release history.'),
    source('rust185','Rust 1.85.0 and Rust 2024','https://blog.rust-lang.org/2025/02/20/Rust-1.85.0/','Rust 2024 edition stabilisation release.'),
    source('rust198','Rust latest release','https://blog.rust-lang.org/releases/latest/','Rust 1.98 release announcement, 2026-08-20.'),
    source('go-history','Go release history','https://go.dev/doc/devel/release','Primary Go release history.'),
    source('go126','Go 1.26 is released','https://go.dev/blog/go1.26','Go 1.26 release announcement, 2026-02-10.'),
    source('kotlin-releases','Kotlin releases','https://kotlinlang.org/docs/releases.html','Primary Kotlin release and support index.'),
    source('cpp-status','Standard C++ status','https://isocpp.org/std/status','Current published C++ standard and work in progress.'),
    source('c-status','WG14 projects and milestones','https://www.open-std.org/jtc1/sc22/wg14/www/projects','ISO C working-group projects.'),
    source('php85','PHP 8.5 release','https://www.php.net/releases/8_5_0.php','Primary PHP 8.5 release page.'),
    source('swift63','Swift.org blog','https://www.swift.org/blog/','Primary Swift announcements; Swift 6.3 released 2026-03-24.')
  ],
  nodes: [
    node('root','Programming Languages','1957-present','root','Programming Languages',null,'Languages evolve through standards, vendor releases, open-source governance and runtime ecosystems. Lines here show selected milestones rather than every version.','Choose two branches and explain whether their numbered releases represent specifications, implementations or both.',['overview','standards'],['ecma262','cpp-status'],'living ecosystem'),
    node('python','Python','1991-present','family','Python','root','Python uses numbered language releases implemented primarily through CPython.','Trace one Python feature through the What’s New index and test whether old code remains valid.',['current','software'],['python-history'],'active'),
    node('python2','Python 2.0','2000','engine','Python','python','Python 2 established the historical line later separated from Python 3.','Explain why migration between major versions may require code changes.',['history'],['python-history'],'end of life'),
    node('python3','Python 3.0','2008','engine','Python','python2','Python 3 deliberately revised incompatible language behaviour.','Find one Python 2 to 3 incompatibility and describe its maintenance cost.',['history','software'],['python-history'],'maintained line'),
    node('python314','Python 3.14.7','2026','engine','Python','python3','A current maintenance release in the 3.14 series.','Check the release page and separate security, bug-fix and language-feature changes.',['current','software'],['python-3147'],'current stable'),
    node('python315','Python 3.15 RC1','2026','sourcePort','Python','python314','A release candidate for Python 3.15, not the final production release.','Explain why a team might test against an RC but avoid deploying it.',['current','software','preview'],['python-315rc1'],'release candidate'),
    node('jvm','Java and JVM','1995-present','family','Java','root','Java language releases are closely connected to JVM and JDK implementations.','Distinguish the Java language, JVM and JDK in a deployment diagram.',['current','software','standards'],['java-history'],'active'),
    node('java8','Java / JDK 8','2014','engine','Java','jvm','JDK 8 is an influential long-lived release line.','Investigate why long-term-support policies affect enterprise upgrade timing.',['software'],['java-history'],'historical release'),
    node('jdk17','JDK 17','2021','engine','Java','java8','JDK 17 is a later long-term-support reference point in many distributions.','Compare language features with runtime and library changes.',['software'],['java-history'],'supported by vendors'),
    node('jdk21','JDK 21','2023','engine','Java','jdk17','JDK 21 is another widely adopted long-term-support line.','Create an upgrade risk register from JDK 17 to 21.',['current','software'],['java-history'],'supported by vendors'),
    node('jdk26','JDK 26','2026','engine','Java','jdk21','JDK 26 reached general availability on 17 March 2026.','Use the project page to classify final, preview and incubator features.',['current','software'],['jdk26'],'current feature release'),
    node('jdk27','JDK 27 RC','2026','sourcePort','Java','jdk26','JDK 27 was at release-candidate status when checked.','Explain what evidence would justify changing this node to released.',['current','preview','software'],['jdk27'],'release candidate'),
    node('dotnet','C# and .NET','2000-present','family','C#','root','C# language versions are delivered with .NET SDK and compiler support.','Map source language, compiler, runtime and libraries for one C# application.',['current','software'],['csharp-history'],'active'),
    node('csharp1','C# 1.0','2002','engine','C#','dotnet','The first standardised C# release established the managed-language line.','Compare managed execution with native compilation at a high level.',['history','standards'],['csharp-history'],'historical'),
    node('csharp8','C# 8.0','2019','engine','C#','csharp1','C# 8 introduced a major modern feature set including nullable reference types.','Assess how compiler analysis can reduce defects without changing runtime data.',['software'],['csharp-history'],'historical'),
    node('csharp12','C# 12','2023','engine','C#','csharp8','C# 12 shipped with .NET 8.','Identify which project settings select a language version.',['software'],['csharp-history'],'supported'),
    node('csharp14','C# 14','2025','engine','C#','csharp12','C# 14 is the current language version supported on .NET 10.','Evaluate whether one C# 14 feature improves readability or only shortens syntax.',['current','software'],['csharp14'],'current'),
    node('js','JavaScript / ECMAScript','1995-present','family','JavaScript','root','JavaScript implementations track the ECMAScript specification and host environments.','Separate language features from browser APIs in a short code sample.',['current','web','standards'],['ecma262'],'living standard'),
    node('es5','ECMAScript 5','2009','engine','JavaScript','js','ES5 was a major compatibility baseline for modern JavaScript.','Find an ES5 feature still common in current code.',['web','history'],['ecma262'],'historical edition'),
    node('es2015','ECMAScript 2015','2015','engine','JavaScript','es5','ES2015 began annual edition naming and delivered major syntax and module changes.','Classify one feature as syntax, semantics or module organisation.',['web','software'],['ecma262'],'historical edition'),
    node('es2026','ECMAScript 2026','2026','engine','JavaScript','es2015','The 2026 edition sits within ECMAScript’s annual standardisation cycle.','Use the live specification and proposals process to distinguish standard from proposal.',['current','web','standards'],['ecma262'],'current edition'),
    node('typescript','TypeScript','2012-present','sourcePort','TypeScript','js','TypeScript extends JavaScript syntax with static type checking and compiles to JavaScript.','Draw the path from TypeScript source to JavaScript execution.',['current','web','software'],['ts-history'],'active'),
    node('ts5','TypeScript 5.x','2023-2026','engine','TypeScript','typescript','The 5.x line developed the established compiler before major 2026 releases.','Compare language service benefits with emitted JavaScript.',['web','software'],['ts-history'],'superseded line'),
    node('ts6','TypeScript 6.0','2026','engine','TypeScript','ts5','TypeScript 6.0 was released on 23 March 2026.','Read the migration notes and identify one potential breaking change.',['current','web','software'],['ts6'],'released'),
    node('ts7','TypeScript 7.0','2026','engine','TypeScript','ts6','TypeScript 7.0 was released on 8 July 2026.','Compare the 6.0 and 7.0 announcements, focusing on compiler architecture and migration.',['current','web','software'],['ts7'],'current'),
    node('systems','Systems Languages','1972-present','family','Systems','root','C, C++, Rust and Go illustrate different approaches to performance, safety and concurrency.','Select a systems task and defend one language choice against two alternatives.',['current','systems','standards'],['c-status','cpp-status'],'active'),
    node('c89','C89 / C90','1989-1990','engine','C','systems','Early ISO standardisation provided a portable baseline for C.','Explain why decades-old C standards remain relevant to toolchains.',['systems','standards','history'],['c-status'],'historical standard'),
    node('c11','C11','2011','engine','C','c89','C11 extended the standard with concurrency and other facilities.','Investigate which C11 features depend on compiler and library support.',['systems','standards'],['c-status'],'published standard'),
    node('c23','C23','2024','engine','C','c11','C23 is the latest published ISO C revision in this selected line.','Compare a C23 change with its earlier compiler extension.',['current','systems','standards'],['c-status'],'current standard'),
    node('cpp98','C++98','1998','engine','C++','systems','C++98 was the first ISO C++ standard.','Describe how C++ relates historically to C without calling it a simple replacement.',['systems','standards','history'],['cpp-status'],'historical standard'),
    node('cpp11','C++11','2011','engine','C++','cpp98','C++11 substantially modernised the language and standard library.','Find one C++11 feature that changed common coding style.',['systems','standards'],['cpp-status'],'published standard'),
    node('cpp23','C++23','2023','engine','C++','cpp11','C++23 is the current published standard while C++26 work continues.','Separate published-standard features from C++26 proposals.',['current','systems','standards'],['cpp-status'],'current standard'),
    node('cpp26','C++26 work','2026','sourcePort','C++','cpp23','C++26 is work in progress rather than a published final standard.','Use proposal status to judge whether production guidance is premature.',['current','systems','preview','standards'],['cpp-status'],'work in progress'),
    node('rust','Rust','2015-present','sourcePort','Rust','systems','Rust combines native performance goals with compile-time memory-safety checks and explicit editions.','Contrast a Rust edition with a compiler release.',['current','systems','software'],['rust-history'],'active'),
    node('rust2018','Rust 2018','2018','engine','Rust','rust','The 2018 edition evolved language ergonomics while preserving edition interoperability.','Explain why editions can coexist in one dependency graph.',['systems'],['rust-history'],'historical edition'),
    node('rust2024','Rust 2024 / 1.85','2025','engine','Rust','rust2018','Rust 1.85 stabilised the Rust 2024 edition.','Identify an edition migration lint and explain its purpose.',['systems','software'],['rust185'],'current edition'),
    node('rust198','Rust 1.98','2026','engine','Rust','rust2024','Rust 1.98 was released on 20 August 2026.','Classify changes as language, compiler, standard library or tooling.',['current','systems','software'],['rust198'],'current stable'),
    node('go','Go','2009-present','sourcePort','Go','systems','Go emphasises simple tooling, fast builds and built-in concurrency primitives.','Compare goroutines with operating-system threads at an appropriate abstraction level.',['current','systems','software'],['go-history'],'active'),
    node('go1','Go 1','2012','engine','Go','go','Go 1 established a compatibility promise for the major release line.','Assess how compatibility promises influence library maintenance.',['systems','software'],['go-history'],'major line'),
    node('go126','Go 1.26','2026','engine','Go','go1','Go 1.26 was released on 10 February 2026.','Use the release notes to identify one compiler and one library change.',['current','systems','software'],['go126'],'current stable'),
    node('other','Application Languages','1995-present','family','Applications','root','Kotlin, PHP and Swift show different platform and application-development paths.','Match each language to typical runtime and deployment contexts without stereotyping its use.',['current','software','web'],['kotlin-releases','php85','swift63'],'active'),
    node('kotlin','Kotlin 2.4.10','2026','engine','Kotlin','other','Kotlin 2.4.10 is the current 2.4 bug-fix release listed by JetBrains.','Use the support table to distinguish latest, stable and supported.',['current','software'],['kotlin-releases'],'current stable'),
    node('php','PHP 8.5','2025','engine','PHP','other','PHP 8.5 is a current server-side language release line.','Check platform requirements before proposing an upgrade.',['current','web','software'],['php85'],'current stable'),
    node('swift','Swift 6.3','2026','engine','Swift','other','Swift 6.3 was announced on 24 March 2026.','Identify one language or tooling change and connect it to an app-development workflow.',['current','software'],['swift63'],'current stable')
  ],
  links: [
    ['js','typescript','transpiles-to','TypeScript is checked and transformed into JavaScript for execution.'],
    ['c23','cpp23','historical-influence','C++ developed from C but is a distinct standardised language.'],
    ['jvm','kotlin','shared-runtime','Kotlin commonly targets the JVM alongside Java.'],
    ['csharp14','jdk26','compare-managed-platforms','Useful comparison of managed application platforms.']
  ]
});

const ai = buildDataset({
  id: 'ai-models',
  title: 'AI Model Family Atlas',
  description: 'Selected public model-family releases and relationships from major developers. Links show succession, variants, distillation or comparable branches, not claims of shared training data.',
  ui: commonUi('Developer family', 'Model release', 'Open-weight branch', 'Variant / modality'),
  presets: [
    {id:'all', title:'Full AI model atlas', description:'Explore selected model families, release cadence, open-weight branches and cross-family distillation links.', tag:'all', view:'timeline'},
    {id:'current', title:'Current model landscape', description:'Focus on 2026 releases and verify status from linked developer sources before making capability comparisons.', tag:'current', view:'force'},
    {id:'open-models', title:'Open-weight ecosystems', description:'Compare Llama, Mistral, Qwen, DeepSeek and gpt-oss. Distinguish downloadable weights from open-source software and open training data.', tag:'open-weights', view:'radial'},
    {id:'reasoning', title:'Reasoning model branches', description:'Trace reasoning-oriented releases and distillation links. Evaluate benchmark claims alongside task design, cost and deployment constraints.', tag:'reasoning', view:'layered'},
    {id:'ethics', title:'Responsible AI investigation', description:'Use release notes as claims to verify, then investigate licensing, privacy, bias, energy, safety evaluation and acceptable-use constraints.', tag:'ethics', view:'force'}
  ],
  sources: [
    source('gpt5','OpenAI: Introducing GPT-5','https://openai.com/index/introducing-gpt-5/','GPT-5 release announcement, 2025-08-07.'),
    source('gpt55','OpenAI: Introducing GPT-5.5','https://openai.com/index/introducing-gpt-5-5/','GPT-5.5 release announcement, 2026-04-23.'),
    source('gpt56','OpenAI: GPT-5.6','https://openai.com/index/gpt-5-6/','GPT-5.6 family announcement, 2026-07-09.'),
    source('gptoss','OpenAI: Introducing gpt-oss','https://openai.com/index/introducing-gpt-oss/','Open-weight reasoning models, 2025-08-05.'),
    source('claude4','Anthropic: Claude 4','https://www.anthropic.com/news/claude-4','Claude 4 family announcement, 2025-05-22.'),
    source('claude46','Anthropic: Claude Opus 4.6','https://www.anthropic.com/news/claude-opus-4-6','Opus 4.6 announcement, 2026-02-05.'),
    source('claude48','Anthropic: Claude Opus 4.8','https://www.anthropic.com/news/claude-opus-4-8','Opus 4.8 announcement, 2026-05-28.'),
    source('claude5','Anthropic: Claude Opus 5','https://www.anthropic.com/news/claude-opus-5','Opus 5 announcement, 2026-07-24.'),
    source('gemini1','Google: Introducing Gemini','https://blog.google/innovation-and-ai/technology/ai/google-gemini-ai/','Original Gemini family announcement, 2023-12-06.'),
    source('gemini25','Google AI: Gemini 2.5 Pro','https://ai.google.dev/gemini-api/docs/models/gemini-2.5-pro','Primary model documentation.'),
    source('gemini3','Google Developers: Gemini 3 API','https://developers.googleblog.com/new-gemini-api-updates-for-gemini-3/','Gemini 3 API announcement, 2025.'),
    source('gemini37','Google AI: Gemini 3.7 Flash','https://ai.google.dev/gemini-api/docs/models/gemini-3.7-flash','Gemini 3.7 Flash documentation, 2026-08-13.'),
    source('llama3','Meta: Introducing Meta Llama 3','https://ai.meta.com/blog/meta-llama-3/','Llama 3 family announcement, 2024-04-18.'),
    source('llama31','Meta: Llama 3.1','https://ai.meta.com/blog/meta-llama-3-1/','Llama 3.1 announcement, 2024-07-23.'),
    source('llama4','Meta: Llama 4','https://ai.meta.com/blog/llama-4-multimodal-intelligence/','Llama 4 announcement, 2025-04-05.'),
    source('mistral3','Mistral AI: Mistral 3','https://mistral.ai/news/mistral-3/','Mistral 3 family announcement, 2025-12.'),
    source('mistralsmall4','Mistral AI: Mistral Small 4','https://mistral.ai/news/mistral-small-4/','Mistral Small 4 announcement, 2026-03.'),
    source('qwen','Qwen technical blog','https://qwenlm.github.io/blog/qwen/','Original Qwen release.'),
    source('qwen2','Qwen2 technical blog','https://qwenlm.github.io/blog/qwen2/','Qwen2 announcement.'),
    source('qwen25','Qwen2.5 technical blog','https://qwenlm.github.io/blog/qwen2.5/','Qwen2.5 announcement.'),
    source('qwen3','Qwen3 technical blog','https://qwenlm.github.io/blog/qwen3/','Qwen3 announcement, 2025-04.'),
    source('deepseekr1','DeepSeek: R1 release','https://api-docs.deepseek.com/news/news250120','DeepSeek-R1 and distillation releases, 2025-01-20.'),
    source('deepseekv31','DeepSeek: V3.1 release','https://api-docs.deepseek.com/news/news250821/','DeepSeek V3.1 announcement, 2025-08-21.'),
    source('deepseekv4','DeepSeek: V4 Pro','https://api-docs.deepseek.com/news/news260813/','DeepSeek V4 Pro announcement, 2026-08-13.')
  ],
  nodes: [
    node('root','AI Model Families','2018-present','root','AI Models',null,'This map samples public releases from several developers. A successor line does not imply identical architecture, data or evaluation.','Choose a capability claim and follow its source before treating it as evidence.',['overview','ethics'],['gpt56','claude5','gemini37'],'living ecosystem'),
    node('openai','OpenAI GPT','2018-present','family','OpenAI','root','The GPT family includes hosted frontier releases and a separate open-weight gpt-oss branch.','Distinguish product names, API model IDs and downloadable model weights.',['current','ethics'],['gpt5','gptoss'],'active'),
    node('gpt4','GPT-4 generation','2023-2024','engine','OpenAI','openai','GPT-4 and multimodal variants preceded the unified GPT-5 line.','Compare a generation label with a specific dated model snapshot.',['history'],['gpt5'],'superseded generation'),
    node('gpt5','GPT-5','2025','engine','OpenAI','gpt4','GPT-5 introduced a unified system spanning fast and deeper reasoning behaviour.','Separate developer capability claims from independently reproducible evaluation.',['reasoning','ethics'],['gpt5'],'released'),
    node('gpt55','GPT-5.5','2026','engine','OpenAI','gpt5','GPT-5.5 extended the hosted GPT-5 family in April 2026.','Build a test set tied to a real task before comparing versions.',['current','reasoning','ethics'],['gpt55'],'released'),
    node('gpt56','GPT-5.6 family','2026','engine','OpenAI','gpt55','GPT-5.6 launched as a family in July 2026.','Explain why a family name may cover models with different speed and capability targets.',['current','reasoning','ethics'],['gpt56'],'current'),
    node('gpt56luna','GPT-5.6 Luna','2026','tool','OpenAI','gpt56','A fast, economical member of the GPT-5.6 family.','Choose a latency-sensitive task and define an acceptable quality threshold.',['current'],['gpt56'],'current'),
    node('gpt56terra','GPT-5.6 Terra','2026','tool','OpenAI','gpt56','A balanced GPT-5.6 family member.','Compare total workflow cost rather than token price alone.',['current'],['gpt56'],'current'),
    node('gpt56sol','GPT-5.6 Sol','2026','tool','OpenAI','gpt56','A frontier capability member of the GPT-5.6 family.','Identify when additional capability is worth greater latency or cost.',['current','reasoning'],['gpt56'],'current'),
    node('gptoss','gpt-oss','2025','sourcePort','OpenAI','openai','OpenAI released downloadable open-weight reasoning models in 2025.','Distinguish open weights, source code, training data and licence permissions.',['open-weights','reasoning','ethics'],['gptoss'],'released'),
    node('anthropic','Anthropic Claude','2023-present','family','Anthropic','root','Claude uses capability tiers and dated generation releases across hosted models.','Compare tier naming with version numbering before selecting a model.',['current','ethics'],['claude4','claude5'],'active'),
    node('claude3','Claude 3 generation','2024','engine','Anthropic','anthropic','Claude 3 established Haiku, Sonnet and Opus tier names.','Explain how tier and generation answer different selection questions.',['history','ethics'],['claude4'],'superseded generation'),
    node('claude4','Claude 4','2025','engine','Anthropic','claude3','Claude 4 launched with Sonnet and Opus variants.','Compare release-note claims using one controlled prompt set.',['reasoning','ethics'],['claude4'],'released'),
    node('opus46','Claude Opus 4.6','2026','engine','Anthropic','claude4','Opus 4.6 was announced in February 2026.','Record model version and date so an evaluation can be reproduced.',['current','reasoning'],['claude46'],'released'),
    node('opus48','Claude Opus 4.8','2026','engine','Anthropic','opus46','Opus 4.8 followed in May 2026.','Investigate what changed between two point releases rather than inferring from numbering.',['current','reasoning'],['claude48'],'released'),
    node('claude5','Claude Opus 5','2026','engine','Anthropic','opus48','Opus 5 was announced in July 2026.','Assess suitability using task accuracy, safety, latency and cost.',['current','reasoning','ethics'],['claude5'],'current'),
    node('google','Google Gemini','2023-present','family','Google','root','Gemini is a multimodal family delivered through products and developer APIs.','Separate a model family announcement from an API availability state.',['current','ethics'],['gemini1','gemini37'],'active'),
    node('gemini1','Gemini 1.0','2023','engine','Google','google','The original Gemini launch presented Ultra, Pro and Nano variants.','Match variant scale to device and service constraints.',['history'],['gemini1'],'superseded generation'),
    node('gemini15','Gemini 1.5','2024','engine','Google','gemini1','Gemini 1.5 developed the family’s long-context and multimodal direction.','Design a test that measures useful retrieval rather than context-window size alone.',['ethics'],['gemini25'],'superseded generation'),
    node('gemini25','Gemini 2.5 Pro','2025','engine','Google','gemini15','Gemini 2.5 Pro is documented as a reasoning-capable multimodal model.','Verify current lifecycle status on the model documentation page.',['reasoning','ethics'],['gemini25'],'stable'),
    node('gemini3','Gemini 3','2025','engine','Google','gemini25','Gemini 3 extended the developer API family.','Compare a preview identifier with a stable identifier before production use.',['reasoning','ethics'],['gemini3'],'released'),
    node('gemini37','Gemini 3.7 Flash','2026','engine','Google','gemini3','Gemini 3.7 Flash documentation was current in August 2026.','Evaluate a fast model on throughput and failure cost, not speed alone.',['current','reasoning'],['gemini37'],'current'),
    node('meta','Meta Llama','2023-present','family','Meta','root','Llama is a downloadable model-weight family with licence terms that must be checked per release.','Audit licence, hardware and data-governance constraints before deployment.',['open-weights','ethics'],['llama3','llama4'],'active'),
    node('llama2','Llama 2','2023','sourcePort','Meta','meta','Llama 2 broadened the public model-weight family.','Explain why downloadable does not automatically mean unrestricted.',['open-weights','ethics'],['llama3'],'superseded'),
    node('llama3','Llama 3','2024','engine','Meta','llama2','Llama 3 introduced a new generation of pretrained and instruction-tuned weights.','Compare base and instruction-tuned purposes.',['open-weights'],['llama3'],'released'),
    node('llama31','Llama 3.1','2024','engine','Meta','llama3','Llama 3.1 expanded the family and included a 405B model.','Estimate deployment requirements before comparing headline capability.',['open-weights','ethics'],['llama31'],'released'),
    node('llama4','Llama 4','2025','engine','Meta','llama31','Llama 4 introduced multimodal mixture-of-experts models.','Separate total parameters from active parameters when interpreting architecture.',['open-weights','ethics'],['llama4'],'current family'),
    node('mistral','Mistral AI','2023-present','family','Mistral','root','Mistral publishes both open-weight and hosted commercial model lines.','Classify each model by access method and licence, not developer name alone.',['open-weights','ethics'],['mistral3'],'active'),
    node('mistral7b','Mistral 7B','2023','sourcePort','Mistral','mistral','Mistral 7B established the developer’s compact open-weight line.','Test whether model size predicts performance on your chosen task.',['open-weights'],['mistral3'],'historical'),
    node('mixtral','Mixtral','2023-2024','engine','Mistral','mistral7b','Mixtral developed a sparse mixture-of-experts branch.','Explain active versus total parameters with a resource budget.',['open-weights'],['mistral3'],'historical family'),
    node('mistral3','Mistral 3','2025','engine','Mistral','mixtral','Mistral 3 is a family spanning small and frontier-scale releases.','Compare a family portfolio rather than treating one score as universal.',['open-weights','ethics'],['mistral3'],'released'),
    node('small4','Mistral Small 4','2026','engine','Mistral','mistral3','Mistral Small 4 continued the compact model line in 2026.','Define a local-deployment scenario and test memory, speed and quality.',['current','open-weights'],['mistralsmall4'],'current'),
    node('qwen-family','Alibaba Qwen','2023-present','family','Qwen','root','Qwen has public multilingual and multimodal model-weight families.','Verify model card, licence and intended use for a specific checkpoint.',['open-weights','ethics'],['qwen','qwen3'],'active'),
    node('qwen1','Qwen','2023','sourcePort','Qwen','qwen-family','The original Qwen release began the public family.','Use the technical blog to identify stated languages and evaluation scope.',['open-weights'],['qwen'],'historical'),
    node('qwen2','Qwen2','2024','engine','Qwen','qwen1','Qwen2 expanded the family’s model sizes and multilingual support.','Compare a base checkpoint with an instruction-tuned checkpoint.',['open-weights'],['qwen2'],'released'),
    node('qwen25','Qwen2.5','2024','engine','Qwen','qwen2','Qwen2.5 developed specialist and general model variants.','Select a specialist model only after checking domain and output requirements.',['open-weights'],['qwen25'],'released'),
    node('qwen3','Qwen3','2025','engine','Qwen','qwen25','Qwen3 introduced hybrid thinking modes across a broad model family.','Test when explicit reasoning improves or harms task efficiency.',['open-weights','reasoning','ethics'],['qwen3'],'current family'),
    node('deepseek','DeepSeek','2024-present','family','DeepSeek','root','DeepSeek includes general, code and reasoning releases, plus distilled checkpoints based on other model families.','Trace model provenance and licences when a checkpoint is distilled from another family.',['open-weights','reasoning','ethics'],['deepseekr1','deepseekv4'],'active'),
    node('deepseekv3','DeepSeek-V3','2024','sourcePort','DeepSeek','deepseek','V3 established the general mixture-of-experts branch used alongside reasoning releases.','Compare general and reasoning-tuned model purposes.',['open-weights'],['deepseekv31'],'released'),
    node('deepseekr1','DeepSeek-R1','2025','engine','DeepSeek','deepseekv3','R1 is a reasoning release accompanied by distilled Qwen- and Llama-based checkpoints.','Explain distillation without describing the student model as a direct successor.',['open-weights','reasoning','ethics'],['deepseekr1'],'released'),
    node('r1qwen','R1-Distill-Qwen','2025','tool','DeepSeek','deepseekr1','Distilled reasoning checkpoints use Qwen base models in several sizes.','Follow both source families when documenting provenance and licence constraints.',['open-weights','reasoning'],['deepseekr1','qwen25'],'released'),
    node('r1llama','R1-Distill-Llama','2025','tool','DeepSeek','deepseekr1','Distilled reasoning checkpoints also use Llama base models.','Compare distillation with fine-tuning and retrieval augmentation.',['open-weights','reasoning'],['deepseekr1','llama31'],'released'),
    node('deepseekv31','DeepSeek-V3.1','2025','engine','DeepSeek','deepseekv3','V3.1 developed the general/hybrid line in August 2025.','Record exact API or checkpoint version when testing.',['open-weights','reasoning'],['deepseekv31'],'released'),
    node('deepseekv4','DeepSeek-V4 Pro','2026','engine','DeepSeek','deepseekv31','DeepSeek announced V4 Pro in August 2026.','Treat a vendor announcement as a starting point for evaluation, not a conclusion.',['current','open-weights','reasoning','ethics'],['deepseekv4'],'current')
  ],
  links: [
    ['qwen25','r1qwen','distilled-into','R1 reasoning outputs were distilled into Qwen-based checkpoints.'],
    ['llama31','r1llama','distilled-into','R1 reasoning outputs were distilled into Llama-based checkpoints.'],
    ['gptoss','deepseekr1','compare-open-reasoning','Comparable classroom branch for open-weight reasoning deployment.'],
    ['llama4','mistral3','compare-open-weights','Open-weight families with different architectures and licences.'],
    ['gpt56','claude5','peer-generation','Contemporary hosted frontier releases.'],
    ['claude5','gemini37','peer-generation','Contemporary hosted model families.']
  ]
});

const esports = buildDataset({
  id: 'esports-ecosystem',
  title: 'Esports Ecosystem Atlas',
  description: 'A curriculum-focused map of publishers, tournament operators, competitions, education pathways, teams, careers, broadcast and commercial relationships.',
  ui: commonUi('Ecosystem sector', 'Organisation / competition', 'Parallel pathway', 'Role / function'),
  presets: [
    {id:'all', title:'Full esports ecosystem', description:'Explore how rights holders, competitions, operators, teams, talent, education, media and commercial partners interact.', tag:'all', view:'force'},
    {id:'l2-games', title:'L2 Unit 1: games, teams and tournaments', description:'Identify tournament structures, current titles, team roles and organising bodies, then compare two competition pathways.', tag:'l2-u1', view:'radial'},
    {id:'l3-intro', title:'L3 Unit 1: introduction to esports', description:'Investigate the size, structure, technology, roles and related industries that make esports an ecosystem rather than only competitive play.', tag:'l3-u1', view:'force'},
    {id:'events', title:'L3 Unit 5: esports events', description:'Follow the dependencies between rights holder, operator, venue, officials, production, platform, teams and audience. Use the map to build an event responsibility matrix.', tag:'l3-u5', view:'layered'},
    {id:'enterprise', title:'Enterprise, careers and branding', description:'Connect L2 Unit 5 and L3 Units 3, 7, 10 and 11 through revenue, sponsorship, audience, brand, social media, casting and employability roles.', tag:'enterprise', view:'force'}
  ],
  sources: [
    source('pearson-l2','Pearson BTEC Level 2 Skills: Esports','https://qualifications.pearson.com/en/qualifications/btec-level-2-skills/esports.html','Official qualification page for Level 2 curriculum context.'),
    source('pearson-l3','Pearson BTEC Nationals: Esports','https://qualifications.pearson.com/en/qualifications/btec-nationals/esports.html','Official qualification page for Level 3 curriculum context.'),
    source('champs','British Esports Student Champs','https://champs.britishesports.org/','Current Student Champs competition portal.'),
    source('champs-about','British Esports Student Champs: About','https://champs.britishesports.org/about','2026/27 game and format information checked 2026-09-01.'),
    source('nse','National Student Esports','https://nse.gg/','UK university esports competition and community.'),
    source('vct','Riot Games Competitive Operations: VALORANT','https://competitiveops.riotgames.com/VALORANT','Official VALORANT Esports and Game Changers competition information.'),
    source('lol-esports','LoL Esports','https://lolesports.com/','Official League of Legends esports portal.'),
    source('efg','ESL FACEIT Group','https://eslfaceitgroup.com/','Tournament operator and esports platform group.'),
    source('iem2026','Counter-Strike: IEM Cologne Major 2026','https://www.counter-strike.net/newsentry/672869045073084948','Valve announcement for the 2026 Major.'),
    source('rlcs2026','Rocket League: RLCS 2026','https://www.rocketleague.com/news/register-for-rlcs-2026-today-and-compete-for-a-share-of-the-6-1-million-dollar-prize-pool','Official RLCS 2026 competition announcement.'),
    source('owcs2026','Overwatch: OWCS 2026','https://overwatch.blizzard.com/en-gb/news/24246297/owcs-2026-season-competitive-details/','Official 2026 season structure.'),
    source('fcpro','EA SPORTS FC Pro rules','https://www.ea.com/games/ea-sports-fc/fc-pro/rules','Current official competition rules portal.'),
    source('twitch','Twitch','https://www.twitch.tv/','Major live-streaming distribution platform.'),
    source('youtube','YouTube Live','https://www.youtube.com/live','Live video distribution platform.')
  ],
  nodes: [
    node('root','Esports Ecosystem','1972-present','root','Esports',null,'Esports depends on game ownership, organised competition, teams, technology, media, audiences and commercial support.','Select one event and identify who owns the game, runs the event, competes, broadcasts and pays.',['overview','l2-u1','l3-u1'],['pearson-l2','pearson-l3'],'living ecosystem'),
    node('rights','Publishers and Rights Holders','1990s-present','family','Rights holders','root','Publishers control game intellectual property and usually set or license official competition rules.','Explain how publisher ownership makes esports governance different from many traditional sports.',['l2-u1','l3-u1','l3-u5'],['vct','lol-esports'],'active'),
    node('riot','Riot Games','2006-present','engine','Rights holders','rights','Riot operates official ecosystems for League of Legends and VALORANT.','Compare one publisher-operated circuit with a third-party operated circuit.',['l2-u1','l3-u1','l3-u5'],['vct','lol-esports'],'active'),
    node('lol','League of Legends Esports','2010-present','tool','Rights holders','riot','League of Legends has regional and international organised competition.','Trace qualification from a regional league to an international event.',['l2-u1','l3-u1'],['lol-esports','champs-about'],'active'),
    node('vct','VALORANT Champions Tour','2021-present','tool','Rights holders','riot','VCT is Riot’s official global VALORANT competition pathway.','Identify open, regional and international stages in the current pathway.',['l2-u1','l3-u1','l3-u5'],['vct'],'active'),
    node('gamechangers','VALORANT Game Changers','2021-present','tool','Rights holders','vct','Game Changers is a complementary competition pathway within VALORANT esports.','Assess how targeted pathways can broaden participation.',['l3-u1','ethics'],['vct'],'active'),
    node('valve','Valve','1996-present','engine','Rights holders','rights','Valve owns Counter-Strike and licenses a tournament ecosystem with external operators.','Compare publisher control with operator responsibility.',['l2-u1','l3-u1','l3-u5'],['iem2026'],'active'),
    node('counterstrike','Counter-Strike','2000-present','tool','Rights holders','valve','Counter-Strike’s competitive ecosystem includes Valve Majors and operator circuits.','Differentiate a game title, circuit, tournament and match.',['l2-u1','l3-u1'],['iem2026'],'active'),
    node('epic-psyonix','Epic Games / Psyonix','2019-present','engine','Rights holders','rights','Psyonix runs Rocket League esports under Epic Games ownership.','Investigate how game updates can affect competitive integrity.',['l2-u1','l3-u1'],['rlcs2026'],'active'),
    node('rlcs','Rocket League Championship Series','2016-present','tool','Rights holders','epic-psyonix','RLCS is the official Rocket League competition circuit.','Map an RLCS season from online qualification to Major or World Championship.',['l2-u1','l3-u5'],['rlcs2026','champs-about'],'active'),
    node('blizzard','Blizzard Entertainment','1991-present','engine','Rights holders','rights','Blizzard owns Overwatch and publishes the official OWCS structure.','Identify what the publisher delegates to regional operators.',['l2-u1','l3-u1'],['owcs2026'],'active'),
    node('owcs','Overwatch Champions Series','2024-present','tool','Rights holders','blizzard','OWCS is the current official Overwatch competition circuit.','Compare its regional stages and international qualification.',['l2-u1','l3-u5'],['owcs2026','champs-about'],'active'),
    node('ea','EA SPORTS','1991-present','engine','Rights holders','rights','EA publishes the FC Pro competition rules for EA SPORTS FC.','Use rules to identify eligibility, platform and conduct requirements.',['l2-u1','l3-u1'],['fcpro'],'active'),
    node('fcpro','FC Pro','2023-present','tool','Rights holders','ea','FC Pro is the official EA SPORTS FC competitive programme.','Compare individual and team-based competition requirements.',['l2-u1','enterprise'],['fcpro'],'active'),
    node('operators','Tournament Operators','2000s-present','family','Operators','root','Operators deliver brackets, rules administration, officials, venues, production and participant services.','Build a RACI matrix for a tournament operator and rights holder.',['l2-u1','l3-u1','l3-u5','enterprise'],['efg'],'active'),
    node('efg','ESL FACEIT Group','2022-present','engine','Operators','operators','EFG combines major tournament-operation and competitive-platform brands.','Identify platform, event, production and commercial functions within the group.',['l3-u1','l3-u5','enterprise'],['efg'],'active'),
    node('iem','Intel Extreme Masters','2007-present','tool','Operators','efg','IEM is a long-running international tournament brand.','Use IEM Cologne 2026 to identify organiser, game owner, title sponsor and venue.',['l2-u1','l3-u5','enterprise'],['iem2026','efg'],'active'),
    node('grassroots','Education and Grassroots','2010s-present','family','Education','root','School, college and university competitions create participation and development pathways.','Compare the aims and eligibility of school/college and university competitions.',['l2-u1','l3-u1','enterprise'],['champs','nse'],'active'),
    node('british-esports','British Esports','2016-present','engine','Education','grassroots','British Esports supports UK pathways, education and the Student Champs.','Identify governing, education, event and community functions.',['l2-u1','l3-u1','l3-u5'],['champs'],'active'),
    node('student-champs','Student Champs 2026/27','2026-2027','tool','Education','british-esports','The 2026/27 Champs lists League of Legends, Overwatch 2, Rocket League, Marvel Rivals and age-restricted VALORANT team competitions.','Compare team size, age rules and match format for two current titles.',['l2-u1','l3-u1','l3-u5'],['champs-about'],'current season'),
    node('nse','National Student Esports','2018-present','sourcePort','Education','grassroots','NSE provides a UK higher-education competition and community pathway.','Check current eligibility and explain why verification matters.',['l2-u1','l3-u1','enterprise'],['nse'],'active'),
    node('competition','Competition Delivery','1970s-present','family','Competition','root','A competition converts game rules into formats, schedules, seeding, officiating and results.','Design a format and justify fairness, time, venue and broadcast trade-offs.',['l2-u1','l3-u5'],['pearson-l2','pearson-l3'],'active'),
    node('formats','Formats and Brackets','ongoing','tool','Competition','competition','Round robin, Swiss, groups and elimination formats create different competitive and scheduling properties.','Simulate eight teams under two formats and compare match count and elimination risk.',['l2-u1','l3-u5'],['pearson-l2'],'curriculum concept'),
    node('rules-integrity','Rules and Competitive Integrity','ongoing','tool','Competition','competition','Eligibility, anti-cheat, pauses, disputes and sanctions support credible results.','Write an evidence chain for resolving one match dispute.',['l2-u1','l3-u5','ethics'],['fcpro','vct'],'active function'),
    node('events-ops','Event Operations','ongoing','tool','Competition','competition','Event delivery coordinates venue, stage, networking, hardware, safety, staffing and schedules.','Identify three single points of failure and propose contingencies.',['l3-u5','enterprise'],['pearson-l3'],'active function'),
    node('people','Teams, Talent and Careers','ongoing','family','People','root','Competitive and production outcomes depend on specialist playing, coaching, operational, creative and technical roles.','Map one role’s responsibilities, evidence of skill and progression route.',['l2-u1','l3-u1','enterprise'],['pearson-l2','pearson-l3'],'active'),
    node('players','Players and Teams','ongoing','engine','People','people','Players compete within rosters, contracts, practice structures and team culture.','Compare in-game role, team role and employment responsibility.',['l2-u1','l3-u1'],['pearson-l3'],'active role'),
    node('performance','Coaching and Performance','ongoing','tool','People','people','Coaches and analysts turn game data, review and practice into strategy and development.','Create a review cycle from replay evidence to a measurable training goal.',['l3-u1','enterprise'],['pearson-l3'],'active role'),
    node('officials','Admins and Officials','ongoing','tool','People','people','Tournament admins enforce rules, manage lobbies and resolve incidents.','Write a decision log that separates observation, rule and ruling.',['l2-u1','l3-u5'],['pearson-l3'],'active role'),
    node('casters','Shoutcasters and Analysts','ongoing','tool','People','people','On-air talent explains action, builds narrative and serves different audience knowledge levels.','Produce a play-by-play line and an analytical follow-up for the same clip.',['l3-u1','enterprise'],['pearson-l3'],'active role'),
    node('media','Media and Audience','2000s-present','family','Media','root','Broadcast and social platforms connect live competition to audiences, communities and measurable engagement.','Trace one match from game server through production to audience interaction.',['l3-u1','l3-u5','enterprise'],['twitch','youtube'],'active'),
    node('broadcast','Live Broadcast Production','ongoing','engine','Media','media','Observers, directors, audio, graphics, replay and streaming systems turn matches into programmes.','Allocate essential roles for a small student broadcast and justify each one.',['l3-u1','l3-u5','enterprise'],['pearson-l3'],'active function'),
    node('twitch','Twitch distribution','2011-present','tool','Media','broadcast','Twitch is a major live distribution and audience-interaction platform for esports.','Evaluate discoverability, moderation and analytics for an event channel.',['l3-u1','l3-u5','enterprise'],['twitch'],'active'),
    node('youtube','YouTube Live distribution','2011-present','tool','Media','broadcast','YouTube supports live and on-demand distribution around the same event content.','Compare live reach with the value of searchable archives and highlights.',['l3-u1','l3-u5','enterprise'],['youtube'],'active'),
    node('commercial','Commercial and Support','ongoing','family','Commercial','root','Revenue and support can include sponsorship, media rights, ticketing, merchandise, publisher funding and services.','Build a value exchange showing what each partner gives and receives.',['l3-u1','l3-u5','enterprise'],['efg'],'active'),
    node('sponsors','Sponsors and Partners','ongoing','engine','Commercial','commercial','Partners exchange funding, products or services for rights, activation and audience association.','Design a sponsorship inventory without promising unverifiable audience outcomes.',['enterprise','l3-u5'],['efg'],'active function'),
    node('brand-social','Brand and Social Media','ongoing','tool','Commercial','commercial','Brand identity and social content connect teams, events, communities and partners.','Create a platform-specific content plan tied to one measurable objective.',['enterprise','l3-u1'],['pearson-l3'],'active function'),
    node('enterprise','Esports Enterprise','ongoing','sourcePort','Commercial','commercial','Esports ventures need a value proposition, target market, resources, finance, legal awareness and risk controls.','Test a venture idea using customer evidence and a basic cost model.',['enterprise'],['pearson-l2','pearson-l3'],'curriculum concept')
  ],
  links: [
    ['valve','iem','licensed-ecosystem','Valve owns Counter-Strike; EFG operates IEM events.'],
    ['counterstrike','iem','competition-title','IEM Cologne 2026 is a Counter-Strike Major.'],
    ['lol','student-champs','education-title','League of Legends is a current Student Champs title.'],
    ['rlcs','student-champs','education-title','Rocket League also appears in the Student Champs pathway.'],
    ['owcs','student-champs','education-title','Overwatch 2 connects professional and student competition contexts.'],
    ['vct','student-champs','education-title','VALORANT appears with an age restriction in Student Champs.'],
    ['competition','broadcast','produced-as','Competition is converted into a viewer-facing programme.'],
    ['broadcast','twitch','distributed-by','A production may be delivered through Twitch.'],
    ['broadcast','youtube','distributed-by','A production may be delivered through YouTube Live.'],
    ['sponsors','iem','supports','Title and event partnerships support competition delivery.'],
    ['players','performance','developed-by','Coaching and analysis support player performance.'],
    ['brand-social','sponsors','activates','Brand content can activate sponsorship rights.']
  ]
});

const broadcast = buildDataset({
  id: 'live-broadcast',
  title: 'Live Esports Broadcast Pipeline Atlas',
  description: 'A production-system map from gameplay and cameras through capture, scenes, audio, encoding, transport, platforms, viewers, monitoring and rights-aware archiving.',
  ui: commonUi('Pipeline stage', 'Technology / process', 'Alternative path', 'Role / control'),
  presets: [
    {id:'all', title:'Full broadcast pipeline', description:'Follow video, audio, data and control from sources to live viewers and archived content.', tag:'all', view:'layered'},
    {id:'l2-streaming', title:'L2 Unit 3: streaming for esports', description:'Build a simple one-PC or two-PC workflow, then justify capture, audio, scenes, encoder, platform and moderation choices.', tag:'l2-u3', view:'layered'},
    {id:'l3-broadcast', title:'L3 Unit 6: live-streamed broadcasting', description:'Analyse hardware, software, platform functions, overlays, lower thirds, data, audio and legal or data-protection controls across a full production.', tag:'l3-u6', view:'force'},
    {id:'networking', title:'L3 Unit 20: networking', description:'Focus on NDI, SRT, RTMP ingestion, HLS delivery, bitrate, latency, resilience and monitoring. Locate each protocol within the path.', tag:'networking', view:'timeline'},
    {id:'troubleshoot', title:'Production troubleshooting', description:'Start at the viewer symptom, work upstream through platform, transport, encoder, mixer and source, and record evidence before changing settings.', tag:'troubleshoot', view:'layered'}
  ],
  sources: [
    source('pearson-l2','Pearson BTEC Level 2 Skills: Esports','https://qualifications.pearson.com/en/qualifications/btec-level-2-skills/esports.html','Official qualification page for Unit 3 context.'),
    source('pearson-l3','Pearson BTEC Nationals: Esports','https://qualifications.pearson.com/en/qualifications/btec-nationals/esports.html','Official qualification page for Units 6 and 20 context.'),
    source('obs','OBS Studio','https://obsproject.com/','Official open-source video recording and live-streaming software site.'),
    source('youtube-encoder','YouTube Help: Create a live stream with an encoder','https://support.google.com/youtube/answer/2907883?hl=en-GB','Official encoder workflow guidance.'),
    source('youtube-settings','YouTube Help: Live encoder settings','https://support.google.com/youtube/answer/2853702?hl=en','Official bitrate, resolution and protocol guidance.'),
    source('twitch-broadcast','Twitch broadcasting guidelines','https://help.twitch.tv/s/article/broadcasting-guidelines','Official Twitch broadcast guidance.'),
    source('twitch-enhanced','Twitch Enhanced Broadcasting','https://help.twitch.tv/s/article/enhanced-broadcasting','Official multiple-encode workflow information.'),
    source('srt','Haivision: SRT','https://www.haivision.com/products/srt-secure-reliable-transport/','Developer information for Secure Reliable Transport.'),
    source('hls','Apple: HTTP Live Streaming','https://developer.apple.com/streaming/','Primary HLS developer information.'),
    source('ndi','NDI documentation: What is NDI?','https://docs.ndi.video/all/getting-started/what-is-ndi','Primary documentation for video, audio and metadata over IP.'),
    source('elgato','Elgato: choosing a capture card','https://www.elgato.com/explorer/products/capture/which-elgato-capture-card-is-right-for-you/','Official capture-card workflow guidance.')
  ],
  nodes: [
    node('root','Live Broadcast System','ongoing','root','Broadcast',null,'A live stream is a chain of sources, capture, production, encoding, transport, distribution and audience feedback. Reliability is limited by the weakest stage.','Choose one viewer symptom and trace every upstream component that could cause it.',['overview','l2-u3','l3-u6','networking','troubleshoot'],['obs','youtube-encoder','twitch-broadcast'],'active system'),
    node('sources','1. Sources','ongoing','family','Sources','root','Gameplay, cameras, microphones and data enter the production as distinct signals with different timing and privacy risks.','Create a source list including connector, format, owner and fallback.',['l2-u3','l3-u6','troubleshoot'],['pearson-l2','pearson-l3'],'active stage'),
    node('game-source','Gameplay output','ongoing','engine','Sources','sources','A game PC or console supplies programme video and game audio.','Check resolution, refresh rate, colour range and copy-protection compatibility.',['l2-u3','l3-u6','troubleshoot'],['elgato'],'active source'),
    node('camera','Cameras and webcams','ongoing','engine','Sources','sources','Cameras add presenters, players, stage and venue context.','Set framing, exposure and consent requirements before going live.',['l2-u3','l3-u6'],['obs'],'active source'),
    node('microphones','Microphones and comms','ongoing','engine','Sources','sources','Commentary, presenters, game sound and communications need separate routing and monitoring.','Make an audio patch list and prevent private comms reaching programme output.',['l2-u3','l3-u6','troubleshoot'],['obs'],'active source'),
    node('game-data','Game and event data','ongoing','tool','Sources','sources','Scores, names, clocks, statistics and bracket data drive graphics and commentary.','Define who may edit each field and how an error is corrected on air.',['l3-u6'],['pearson-l3'],'active source'),
    node('capture','2. Capture and Ingest','ongoing','family','Capture','root','Capture converts or transfers source signals into the production system.','Compare one-PC, two-PC and network-video designs against budget and failure risk.',['l2-u3','l3-u6','networking','troubleshoot'],['elgato','ndi'],'active stage'),
    node('one-pc','One-PC workflow','ongoing','engine','Capture','capture','The game and production software share one computer’s resources.','Measure game frame time and encoder load under realistic scenes.',['l2-u3','l3-u6','troubleshoot'],['obs'],'common design'),
    node('capture-card','HDMI capture card','ongoing','engine','Capture','capture','A capture device ingests video from a console, camera or separate gaming PC.','Check input, passthrough and USB/PCIe bandwidth against the required format.',['l2-u3','l3-u6','troubleshoot'],['elgato'],'active component'),
    node('two-pc','Two-PC workflow','ongoing','sourcePort','Capture','capture-card','A gaming system sends audio/video to a dedicated production computer.','Explain which failures are isolated and which new cables or routing risks appear.',['l2-u3','l3-u6','troubleshoot'],['elgato'],'common design'),
    node('ndi','NDI over IP','ongoing','sourcePort','Capture','capture','NDI transports video, audio and metadata across an IP network for production.','Calculate whether the LAN and switches can support every planned stream.',['l3-u6','networking','troubleshoot'],['ndi'],'active technology'),
    node('production','3. Production and Mixing','ongoing','family','Production','root','Production software and operators compose sources into a coherent programme.','Turn a running order into scenes, cues, roles and contingencies.',['l2-u3','l3-u6','troubleshoot'],['obs'],'active stage'),
    node('obs','OBS Studio','ongoing','engine','Production','production','OBS captures and mixes real-time video and audio into scenes for recording and streaming.','Build scenes with consistent naming and test every transition before broadcast.',['l2-u3','l3-u6','troubleshoot'],['obs'],'active software'),
    node('scenes','Scenes and transitions','ongoing','tool','Production','obs','Scenes organise layouts such as holding, gameplay, desk, interview and results.','Create a minimum scene set and explain the purpose of each.',['l2-u3','l3-u6'],['obs'],'production control'),
    node('overlays','Overlays and lower thirds','ongoing','tool','Production','obs','Graphics communicate identity, names, score, state and sponsorship without hiding critical play.','Test legibility at phone size and against changing game backgrounds.',['l2-u3','l3-u6'],['pearson-l3'],'production control'),
    node('audio-mix','Audio mixing and monitoring','ongoing','tool','Production','obs','Level, routing, delay, filters and monitoring determine whether speech and game audio remain intelligible and synchronised.','Use meters and headphones to set a repeatable speech-over-game balance.',['l2-u3','l3-u6','troubleshoot'],['obs'],'production control'),
    node('observer-replay','Observer and replay','ongoing','tool','Production','production','Observers select in-game viewpoints; replay operators recover important action.','Prioritise information and narrative when several events happen simultaneously.',['l3-u6'],['pearson-l3'],'production role'),
    node('encoding','4. Encoding','ongoing','family','Encoding','root','An encoder compresses programme video and audio within platform, hardware and bandwidth limits.','Justify codec, resolution, frame rate, bitrate and keyframe interval as one connected choice.',['l2-u3','l3-u6','networking','troubleshoot'],['youtube-settings','twitch-broadcast'],'active stage'),
    node('software-encode','Software encoding','ongoing','engine','Encoding','encoding','CPU-based encoding shares general compute with production and other applications.','Monitor utilisation and dropped frames during a stress test.',['l2-u3','l3-u6','troubleshoot'],['obs'],'active method'),
    node('hardware-encode','Hardware encoding','ongoing','sourcePort','Encoding','encoding','Dedicated media blocks can reduce CPU load, with quality and feature trade-offs.','Compare output quality at equal bitrate using a moving gameplay sequence.',['l2-u3','l3-u6','troubleshoot'],['obs'],'active method'),
    node('renditions','Multiple renditions','ongoing','tool','Encoding','encoding','Multiple resolution and bitrate versions can improve viewer adaptation but increase encoding and upload demand.','Create a bandwidth budget before enabling simultaneous encodes.',['l3-u6','networking'],['twitch-enhanced'],'active method'),
    node('transport','5. Contribution Transport','ongoing','family','Transport','root','Contribution protocols carry the encoded programme from production to a platform or remote production centre.','Place each protocol on the path and avoid confusing contribution with viewer delivery.',['l3-u6','networking','troubleshoot'],['srt','youtube-settings'],'active stage'),
    node('rtmp','RTMP / RTMPS ingest','ongoing','engine','Transport','transport','RTMP and encrypted RTMPS remain common live-platform ingest protocols.','Check platform server URL, stream-key security and firewall requirements.',['l2-u3','l3-u6','networking','troubleshoot'],['youtube-settings','twitch-broadcast'],'active protocol'),
    node('srt','SRT contribution','2017-present','sourcePort','Transport','transport','SRT is designed for secure, reliable, low-latency contribution across unpredictable networks.','Test latency and packet loss while changing the recovery buffer.',['l3-u6','networking','troubleshoot'],['srt'],'active protocol'),
    node('connectivity','Internet and redundancy','ongoing','tool','Transport','transport','Upload capacity, stability, routing and backup connectivity determine contribution reliability.','Measure sustained upload and define the trigger for switching to a backup path.',['l2-u3','l3-u6','networking','troubleshoot'],['youtube-settings'],'operational control'),
    node('distribution','6. Platform Distribution','ongoing','family','Distribution','root','Platforms ingest, process, moderate, transcode, package and distribute live content.','Compare creator controls with platform-controlled processing.',['l2-u3','l3-u6','networking','troubleshoot'],['youtube-encoder','twitch-enhanced'],'active stage'),
    node('twitch','Twitch','ongoing','engine','Distribution','distribution','Twitch provides live distribution, chat and broadcast workflows, including enhanced multi-encode options.','Configure a private test and document moderation plus failure-recovery controls.',['l2-u3','l3-u6','networking'],['twitch-broadcast','twitch-enhanced'],'active platform'),
    node('youtube','YouTube Live','ongoing','engine','Distribution','distribution','YouTube accepts encoder contribution and creates viewer-compatible output formats.','Match official encoder settings to the event’s resolution and frame rate.',['l2-u3','l3-u6','networking'],['youtube-encoder','youtube-settings'],'active platform'),
    node('transcoding','Platform transcoding','ongoing','tool','Distribution','distribution','Platforms may create multiple renditions to suit different viewer connections and devices.','Explain why the creator’s upload bitrate is not the viewer’s only option.',['l3-u6','networking'],['twitch-enhanced','youtube-settings'],'platform function'),
    node('hls','HLS delivery','2009-present','tool','Distribution','distribution','HTTP Live Streaming segments and playlists support adaptive viewer delivery through ordinary web infrastructure.','Trace manifest, media segments, CDN cache and player adaptation.',['l3-u6','networking'],['hls'],'active protocol'),
    node('audience','7. Audience and Assurance','ongoing','family','Audience','root','Viewer experience, moderation, analytics, monitoring and archiving close the production loop.','Define quality indicators from both operator and viewer perspectives.',['l2-u3','l3-u6','troubleshoot'],['twitch-broadcast','youtube-encoder'],'active stage'),
    node('player','Viewer player and device','ongoing','engine','Audience','audience','The player selects a rendition, buffers content and presents it under device and network constraints.','Test the programme on mobile, desktop and a restricted connection.',['l2-u3','l3-u6','networking','troubleshoot'],['hls'],'active endpoint'),
    node('chat-mod','Chat and moderation','ongoing','tool','Audience','audience','Live interaction needs clear rules, moderation tools, escalation and safeguarding.','Create a moderation matrix for spam, harassment, spoilers and safeguarding concerns.',['l2-u3','l3-u6'],['twitch-broadcast'],'operational control'),
    node('monitoring','Confidence monitoring','ongoing','tool','Audience','audience','Operators should monitor local programme, platform return and public output because each proves a different stage.','Match each monitoring point to the failures it can reveal.',['l2-u3','l3-u6','troubleshoot'],['obs','youtube-encoder'],'operational control'),
    node('analytics','Stream health and analytics','ongoing','tool','Audience','audience','Dropped frames, bitrate, latency, playback failures and engagement metrics support technical and editorial review.','Separate real-time fault indicators from post-event success measures.',['l2-u3','l3-u6','troubleshoot'],['youtube-encoder','twitch-broadcast'],'operational control'),
    node('archive-rights','Recording, rights and data','ongoing','tool','Audience','audience','Recordings, music, player images, chat, names and analytics may create copyright, consent, retention and data-protection duties.','Build a pre-flight rights and data checklist with named owners and retention periods.',['l3-u6'],['pearson-l3'],'governance control')
  ],
  links: [
    ['game-source','capture-card','feeds','HDMI or similar output is ingested by the capture device.'],
    ['camera','obs','feeds','Camera capture becomes a production source.'],
    ['microphones','audio-mix','feeds','Microphone signals are routed and mixed.'],
    ['game-data','overlays','drives','Validated data populates graphics.'],
    ['capture-card','obs','ingested-by','Capture devices expose video and audio to production software.'],
    ['ndi','obs','ingested-by','NDI sources can enter IP-based production.'],
    ['obs','software-encode','outputs-to','The mixed programme is passed to an encoder.'],
    ['obs','hardware-encode','outputs-to','OBS can use supported hardware encoders.'],
    ['software-encode','rtmp','contributes-via','Encoded output is sent using a contribution protocol.'],
    ['hardware-encode','srt','contributes-via','Remote workflows may use SRT contribution.'],
    ['rtmp','twitch','ingest-to','RTMP/RTMPS can feed a live platform.'],
    ['rtmp','youtube','ingest-to','RTMP/RTMPS can feed YouTube Live.'],
    ['srt','distribution','ingest-to','SRT may feed compatible platforms or remote production gateways.'],
    ['twitch','transcoding','creates','Platform processing can create viewer renditions.'],
    ['youtube','transcoding','creates','YouTube automatically processes live output formats.'],
    ['transcoding','hls','packaged-as','Viewer renditions can be packaged for adaptive delivery.'],
    ['hls','player','delivered-to','The player retrieves playlists and media segments.'],
    ['player','monitoring','observed-by','Public-output monitoring confirms end-to-end delivery.'],
    ['analytics','encoding','feedback-to','Stream-health evidence informs encoder changes.']
  ]
});

applyGeneratedExpansions({programming, ai, esports, broadcast});
expandStoredDatasets(root);

for(const dataset of [programming, ai, esports, broadcast]){
  const output = path.join(root, 'data', 'lineages', `${dataset.id}.json`);
  fs.writeFileSync(output, `${JSON.stringify(dataset, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, output)}: ${dataset.nodes.length} nodes, ${dataset.edges.length} edges`);
}
