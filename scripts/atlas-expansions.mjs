import fs from 'node:fs';
import path from 'node:path';

const checked = '2026-09-01';
const s = (id, label, url, note) => ({id, label, url, note});
const n = (id, name, year, type, lineage, parent, note, hook, tags, sourceIds, status = 'released') => ({
  id, name, year, type, lineage, parent, ...(parent === 'root' || type === 'family' ? {branch:true} : {}),
  note, hook, tags, sourceIds, verifiedOn: checked, status
});

function applyExpansion(dataset, {sources = [], nodes = [], links = [], presets = []}){
  const sourceIds = new Set((dataset.sources || []).map(item => item.id).filter(Boolean));
  dataset.sources ||= [];
  sources.forEach(item => { if(!sourceIds.has(item.id)){ dataset.sources.push(item); sourceIds.add(item.id); } });

  const nodeIds = new Set(dataset.nodes.map(item => item.id));
  const added = [];
  nodes.forEach(item => {
    if(!nodeIds.has(item.id)){
      dataset.nodes.push(item);
      nodeIds.add(item.id);
      added.push(item);
    } else Object.assign(dataset.nodes.find(existing => existing.id === item.id), item);
  });

  dataset.edges ||= [];
  dataset.edges = dataset.edges.filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target));
  const edgeIds = new Set(dataset.edges.map(edge => `${edge.source}|${edge.target}|${edge.type || ''}`));
  added.filter(item => item.parent).forEach(item => {
    const type = item.parent === 'root' || item.type === 'family' ? 'branch' : 'successor';
    const key = `${item.parent}|${item.id}|${type}`;
    if(!edgeIds.has(key)){
      dataset.edges.push({source:item.parent, target:item.id, type, strength:1});
      edgeIds.add(key);
    }
  });
  links.forEach(([source, target, type, note]) => {
    const key = `${source}|${target}|${type}`;
    if(nodeIds.has(source) && nodeIds.has(target) && !edgeIds.has(key)){
      dataset.edges.push({source, target, type, strength:0.72, ...(note ? {note} : {})});
      edgeIds.add(key);
    }
  });
  dataset.curriculumPresets ||= [];
  presets.forEach(preset => {
    const existing = dataset.curriculumPresets.find(item => item.id === preset.id);
    if(existing) Object.assign(existing, preset);
    else dataset.curriculumPresets.push(preset);
  });
}

export function applyGeneratedExpansions({programming, ai, esports, broadcast}){
  applyExpansion(programming, {
    presets: [
      {id:'data-science', title:'Data and scientific programming', description:'Compare R, Julia and Python release ecosystems, then design a reproducibility record covering interpreter, packages, data and environment.', tag:'data', view:'timeline'},
      {id:'functional', title:'Functional programming ideas', description:'Use Haskell, Scala and Clojure to investigate purity, immutable data, type systems and hosted runtimes.', tag:'standards', view:'radial'},
      {id:'automation', title:'Shell and automation', description:'Compare Bash and PowerShell pipelines, quoting, error handling and cross-platform deployment risks.', tag:'automation', view:'layered'}
    ],
    sources: [
      s('ruby4','Ruby 4.0.0 release','https://www.ruby-lang.org/en/news/2025/12/25/ruby-4-0-0-released/','Primary Ruby 4.0 release announcement.'),
      s('r-current','CRAN: current R release','https://cran.r-project.org/','Primary R distribution; R 4.6.1 current when checked.'),
      s('julia112','Julia 1.12 highlights','https://julialang.org/blog/2025/10/julia-1.12-highlights/','Primary Julia 1.12 release overview.'),
      s('lua-versions','Lua version history','https://www.lua.org/versions.html','Primary Lua version and reference-manual index.'),
      s('dart-evolution','Dart language evolution','https://dart.dev/resources/language/evolution','Primary Dart language-version history.'),
      s('scala3','Scala 3 documentation','https://docs.scala-lang.org/scala3/','Primary Scala 3 language documentation.'),
      s('clojure-releases','Clojure releases','https://clojure.org/releases/downloads','Primary Clojure release index.'),
      s('haskell-reports','Haskell language reports','https://www.haskell.org/onlinereport/','Primary Haskell 98 and 2010 language reports.'),
      s('powershell-life','PowerShell support lifecycle','https://learn.microsoft.com/en-us/powershell/scripting/install/powershell-support-lifecycle','Microsoft support and release policy for PowerShell.'),
      s('bash','GNU Bash','https://www.gnu.org/software/bash/','Primary GNU Bash project and release information.')
    ],
    nodes: [
      n('data-languages','Data and Scientific Languages','1976-present','family','Data languages','root','R and Julia represent different approaches to statistical and technical computing.','Compare package ecosystems, execution models and reproducibility requirements for one analysis task.',['current','software','data'],['r-current','julia112'],'active'),
      n('r-language','R','1993-present','sourcePort','R','data-languages','R is a language and environment for statistical computing distributed through CRAN.','Separate the language release, package version and analysis environment in a reproducibility record.',['current','data'],['r-current'],'active'),
      n('r10','R 1.0','2000','engine','R','r-language','R 1.0 marked a major public release milestone.','Identify which historical scripts would need package or syntax migration.',['history','data'],['r-current'],'historical'),
      n('r40','R 4.0','2020','engine','R','r10','R 4.0 began the current major release series.','Investigate one compatibility change at the 4.0 boundary.',['data'],['r-current'],'historical release'),
      n('r461','R 4.6.1','2026','engine','R','r40','R 4.6.1 was the current CRAN release when checked.','Capture session information and package versions for a repeatable practical.',['current','data'],['r-current'],'current stable'),
      n('julia','Julia','2012-present','sourcePort','Julia','data-languages','Julia targets technical computing with a high-level language and just-in-time compilation.','Compare time-to-first-execution with steady-state performance for a small numerical task.',['current','data','systems'],['julia112'],'active'),
      n('julia10','Julia 1.0','2018','engine','Julia','julia','Julia 1.0 established the stable 1.x language line.','Explain how a 1.x compatibility commitment affects library authors.',['data'],['julia112'],'historical release'),
      n('julia112','Julia 1.12','2025','engine','Julia','julia10','Julia 1.12 was released in October 2025.','Classify release changes as language, compiler, package manager or standard library.',['current','data','systems'],['julia112'],'current series'),
      n('dynamic-languages','Dynamic Application Languages','1993-present','family','Dynamic applications','root','Ruby, Lua and Dart show contrasting server, embedded and application-development ecosystems.','Match runtime, deployment target and tooling constraints to a suitable language.',['current','software'],['ruby4','lua-versions','dart-evolution'],'active'),
      n('ruby','Ruby','1995-present','sourcePort','Ruby','dynamic-languages','Ruby is a dynamic language with a mature server and automation ecosystem.','Distinguish the Ruby language release from the Rails framework release.',['current','software','web'],['ruby4'],'active'),
      n('ruby18','Ruby 1.8','2003','engine','Ruby','ruby','Ruby 1.8 was a widely used early production line.','Find a compatibility issue that affected later migration.',['history','web'],['ruby4'],'historical'),
      n('ruby20','Ruby 2.0','2013','engine','Ruby','ruby18','Ruby 2.0 began a long major-version period.','Compare a major release promise with semantic versioning expectations.',['software','web'],['ruby4'],'historical'),
      n('ruby30','Ruby 3.0','2020','engine','Ruby','ruby20','Ruby 3.0 introduced a new major release series.','Evaluate performance claims using a workload relevant to the learner project.',['software','web'],['ruby4'],'supported line'),
      n('ruby40','Ruby 4.0','2025','engine','Ruby','ruby30','Ruby 4.0.0 was released on 25 December 2025.','Read the release announcement and identify stable versus experimental features.',['current','software','web'],['ruby4'],'current major'),
      n('lua','Lua','1993-present','sourcePort','Lua','dynamic-languages','Lua is a compact embeddable language used in games and applications.','Trace the boundary between a host application and embedded Lua scripts.',['current','software','games'],['lua-versions'],'active'),
      n('lua51','Lua 5.1','2006','engine','Lua','lua','Lua 5.1 remains an important compatibility target in embedded ecosystems.','Explain why embedded products may retain an older language version.',['games','software'],['lua-versions'],'historical but used'),
      n('lua54','Lua 5.4','2020','engine','Lua','lua51','Lua 5.4 is the current official release series.','Compare one 5.4 language change with 5.1 compatibility.',['current','games','software'],['lua-versions'],'current stable'),
      n('dart','Dart','2011-present','sourcePort','Dart','dynamic-languages','Dart is an application language closely associated with Flutter and multiple compilation targets.','Draw the build path for a Dart mobile or web application.',['current','software','web'],['dart-evolution'],'active'),
      n('dart1','Dart 1','2013','engine','Dart','dart','Dart 1 established the initial stable language line.','Identify how early optional typing differed from later sound typing.',['history','software'],['dart-evolution'],'historical'),
      n('dart2','Dart 2','2018','engine','Dart','dart1','Dart 2 made a sound static type system central to the language.','Use a small example to show a compile-time type failure.',['software','web'],['dart-evolution'],'historical major'),
      n('dart3','Dart 3','2023-present','engine','Dart','dart2','Dart 3 continued sound null safety and modern language features.','Check the minimum SDK constraint before adopting a Dart 3 feature.',['current','software','web'],['dart-evolution'],'current major'),
      n('functional','Functional and JVM Alternatives','1990-present','family','Functional languages','root','Haskell, Scala and Clojure expose functional ideas through different runtime and type-system choices.','Implement the same transformation in two branches and compare state, types and runtime.',['software','standards'],['haskell-reports','scala3','clojure-releases'],'active'),
      n('haskell98','Haskell 98','1998','engine','Haskell','functional','Haskell 98 defined a standardised lazy functional-language baseline.','Explain purity and lazy evaluation using one traceable expression.',['standards','software'],['haskell-reports'],'historical standard'),
      n('haskell2010','Haskell 2010','2010','engine','Haskell','haskell98','Haskell 2010 is the later published language report.','Separate report-standard features from compiler extensions.',['standards','software'],['haskell-reports'],'published standard'),
      n('scala2','Scala 2','2006','engine','Scala','functional','Scala 2 combined object-oriented and functional programming on the JVM.','Compare Scala bytecode deployment with Java deployment.',['software'],['scala3'],'historical major'),
      n('scala3','Scala 3','2021-present','engine','Scala','scala2','Scala 3 revised the language while retaining the JVM ecosystem.','Use migration guidance to classify source and binary compatibility risks.',['current','software'],['scala3'],'current major'),
      n('clojure1','Clojure 1.x','2009-present','sourcePort','Clojure','functional','Clojure is a hosted Lisp whose main implementation targets the JVM.','Compare immutable data and managed references with conventional mutable state.',['current','software'],['clojure-releases'],'active'),
      n('shells','Shell and Automation Languages','1989-present','family','Shells','root','Bash and PowerShell combine language features with operating-system command ecosystems.','Write the same file-management task safely in both shells and compare object versus text pipelines.',['current','software','automation'],['bash','powershell-life'],'active'),
      n('bash5','GNU Bash 5.x','2019-present','engine','Bash','shells','Bash 5.x is a current major shell line across Unix-like systems.','Audit quoting, globbing and exit-code handling in a deployment script.',['current','automation'],['bash'],'current major'),
      n('powershell7','PowerShell 7','2020-present','engine','PowerShell','shells','PowerShell 7 is the cross-platform modern PowerShell line.','Compare an object pipeline with a text pipeline and identify data-loss risks.',['current','automation'],['powershell-life'],'active')
    ],
    links: [
      ['jvm','scala2','shared-runtime','Scala commonly targets the JVM.'],
      ['jvm','clojure1','shared-runtime','Clojure commonly targets the JVM.'],
      ['dart3','js','compiles-to','Dart can compile applications for JavaScript-based web deployment.'],
      ['lua','game-source','embedded-in','Lua is frequently embedded within game and application engines.']
    ]
  });

  applyExpansion(ai, {
    presets: [
      {id:'model-provenance', title:'Model provenance and distillation', description:'Trace base models, specialist branches and DeepSeek-R1 distillation links. Record developer, checkpoint, licence and transformation evidence.', tag:'open-weights', view:'force'},
      {id:'code-models', title:'AI for software development', description:'Compare general models with specialist code branches such as Codestral, Qwen2.5-Coder and DeepSeek-Coder using tests and repository-level tasks.', tag:'ethics', view:'layered'},
      {id:'multimodal', title:'Multimodal model branches', description:'Investigate omni, vision and edge variants. Build an evaluation that requires grounded use of image or audio input.', tag:'current', view:'radial'}
    ],
    sources: [
      s('gpt3','OpenAI: Language Models are Few-Shot Learners','https://openai.com/index/language-models-are-few-shot-learners/','GPT-3 research announcement.'),
      s('gpt4o','OpenAI: Hello GPT-4o','https://openai.com/index/hello-gpt-4o/','GPT-4o multimodal release announcement.'),
      s('openai-o1','OpenAI: Learning to reason with LLMs','https://openai.com/index/learning-to-reason-with-llms/','OpenAI o1 reasoning model announcement.'),
      s('claude-sonnet5','Anthropic: Claude Sonnet 5','https://www.anthropic.com/news/claude-sonnet-5','Sonnet 5 announcement, 2026-06-30.'),
      s('claude-fable5','Anthropic: Claude Fable 5 and Mythos 5','https://www.anthropic.com/news/claude-fable-5-mythos-5','Fable 5 and Mythos 5 announcement, 2026-06-09.'),
      s('gemma3','Google: Gemma 3','https://blog.google/technology/developers/gemma-3/','Google open-model family announcement.'),
      s('llama32','Meta: Llama 3.2','https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/','Llama 3.2 multimodal and edge variants.'),
      s('mistral-medium35','Mistral AI: Mistral Medium 3.5','https://mistral.ai/news/vibe-remote-agents-mistral-medium-3-5/','Mistral Medium 3.5 announcement, 2026-05.'),
      s('qwen25coder','Qwen2.5-Coder','https://qwenlm.github.io/blog/qwen2.5-coder-family/','Qwen specialist coding family announcement.'),
      s('deepseek32','DeepSeek V3.2 release','https://api-docs.deepseek.com/news/news251201/','DeepSeek V3.2 announcement, 2025-12.'),
      s('deepseekv4vision','DeepSeek V4 Flash Vision Experimental','https://api-docs.deepseek.com/news/news260821/','Vision experimental release, 2026-08-21.')
    ],
    nodes: [
      n('gpt3','GPT-3','2020','engine','OpenAI','openai','GPT-3 demonstrated large-scale few-shot language modelling before the ChatGPT product era.','Compare research model, product interface and API deployment as distinct layers.',['history','ethics'],['gpt3'],'historical'),
      n('gpt35','GPT-3.5 / ChatGPT launch','2022','engine','OpenAI','gpt3','GPT-3.5 models powered the early public ChatGPT launch period.','Explain how a product launch can increase impact without being a new base-model generation.',['history','ethics'],['gpt3'],'superseded generation'),
      n('gpt4base','GPT-4','2023','engine','OpenAI','gpt35','GPT-4 established the generation later expanded through Turbo and multimodal variants.','Record exact model identifiers instead of treating GPT-4 as one immutable model.',['history','ethics'],['gpt4o'],'superseded generation'),
      n('gpt4o','GPT-4o','2024','tool','OpenAI','gpt4base','GPT-4o introduced an omni multimodal branch across text, image and audio interactions.','Create a modality matrix showing input, output and evaluation requirements.',['ethics'],['gpt4o'],'released'),
      n('o1','OpenAI o1','2024','sourcePort','OpenAI','openai','o1 made test-time reasoning a distinct named model branch.','Compare answer quality and compute cost on problems that do and do not benefit from deliberation.',['reasoning','ethics'],['openai-o1'],'released'),
      n('o3','OpenAI o3','2025','engine','OpenAI','o1','o3 continued the reasoning-series branch before GPT-5 unified model routing.','Avoid comparing benchmark scores without matching tools and reasoning settings.',['reasoning','ethics'],['gpt5'],'released'),
      n('gptoss20','gpt-oss-20b','2025','tool','OpenAI','gptoss','The smaller gpt-oss checkpoint targets more accessible local or specialised deployment.','Estimate memory needs at two quantisation levels before selecting hardware.',['open-weights','reasoning'],['gptoss'],'released'),
      n('gptoss120','gpt-oss-120b','2025','tool','OpenAI','gptoss','The larger gpt-oss checkpoint increases deployment demands.','Compare throughput, memory and evaluation quality against the 20B variant.',['open-weights','reasoning'],['gptoss'],'released'),
      n('claude1','Claude 1','2023','engine','Anthropic','anthropic','Claude 1 began Anthropic’s public hosted model family.','Build a release timeline using dated announcements rather than product recollection.',['history','ethics'],['claude4'],'historical'),
      n('claude2','Claude 2','2023','engine','Anthropic','claude1','Claude 2 expanded the early family before tiered Claude 3 models.','Identify which capability claims are no longer meaningful for a retired model.',['history','ethics'],['claude4'],'retired generation'),
      n('claude35','Claude 3.5 Sonnet','2024','tool','Anthropic','claude3','Claude 3.5 Sonnet was a major mid-generation capability update.','Explain why decimal generation labels can still represent material changes.',['history','ethics'],['claude4'],'superseded'),
      n('sonnet46','Claude Sonnet 4.6','2026','tool','Anthropic','claude4','Sonnet 4.6 was a cost-performance branch of the Claude 4 generation.','Compare a tier change with a generation change.',['current','reasoning'],['claude46'],'released'),
      n('fable5','Claude Fable 5','2026','tool','Anthropic','claude5','Fable 5 is a Claude 5 tier aimed at broad professional work.','Check current access and safeguards before planning classroom use.',['current','ethics'],['claude-fable5'],'current'),
      n('mythos5','Claude Mythos 5','2026','tool','Anthropic','claude5','Mythos 5 is a high-capability Claude 5 tier with stronger cyber safeguards and access considerations.','Discuss why capability-sensitive safeguards may differ between tiers.',['current','reasoning','ethics'],['claude-fable5'],'current restricted tier'),
      n('sonnet5','Claude Sonnet 5','2026','tool','Anthropic','claude5','Sonnet 5 extends the fifth-generation cost-performance range.','Test a representative workflow instead of assuming tier names map directly across generations.',['current','reasoning','ethics'],['claude-sonnet5'],'current'),
      n('gemini15flash','Gemini 1.5 Flash','2024','tool','Google','gemini15','Flash created a throughput-oriented branch of Gemini 1.5.','Compare latency, context use and error cost on a high-volume task.',['ethics'],['gemini25'],'superseded'),
      n('gemini20flash','Gemini 2.0 Flash','2024-2025','engine','Google','gemini15flash','Gemini 2.0 Flash developed the fast multimodal API line.','Separate preview, experimental and stable API identifiers.',['ethics'],['gemini25'],'superseded'),
      n('gemini36','Gemini 3.6 Flash','2026','engine','Google','gemini3','Gemini 3.6 Flash preceded 3.7 as a stable Flash generation.','Use model lifecycle status to plan migration windows.',['current','reasoning'],['gemini37'],'previous stable'),
      n('gemma','Google Gemma','2024-present','sourcePort','Google','google','Gemma is Google’s separate downloadable open-model family.','Distinguish Gemini hosted models from Gemma downloadable weights.',['open-weights','ethics'],['gemma3'],'active'),
      n('gemma3','Gemma 3','2025','engine','Google','gemma','Gemma 3 expanded the open-model family with multimodal and size variants.','Choose a checkpoint using licence, modality and device constraints.',['open-weights','ethics'],['gemma3'],'current family'),
      n('llama1','LLaMA','2023','sourcePort','Meta','meta','The original research release preceded the more broadly licensed Llama 2 family.','Compare research access with production licence permissions.',['open-weights','history','ethics'],['llama3'],'historical'),
      n('llama32','Llama 3.2','2024','tool','Meta','llama31','Llama 3.2 added vision and smaller edge-oriented variants.','Match a model size and modality to an edge-device constraint.',['open-weights','ethics'],['llama32'],'released'),
      n('codestral','Codestral','2024-present','sourcePort','Mistral','mistral','Codestral is a specialist code-model branch rather than a general chat successor.','Evaluate repository completion and explanation tasks separately.',['open-weights','ethics'],['mistral3'],'active specialist'),
      n('medium35','Mistral Medium 3.5','2026','tool','Mistral','mistral3','Medium 3.5 is a hosted mid-tier model release from May 2026.','Compare hosted and downloadable deployment constraints.',['current','ethics'],['mistral-medium35'],'current'),
      n('qwen-vl','Qwen-VL','2023-present','sourcePort','Qwen','qwen-family','Qwen-VL is the family’s vision-language branch.','Create an evaluation containing image-grounded questions that cannot be solved from text alone.',['open-weights','ethics'],['qwen'],'active branch'),
      n('qwen25coder','Qwen2.5-Coder','2024','tool','Qwen','qwen25','Qwen2.5-Coder is a specialist coding branch in multiple sizes.','Compare code completion, repair and explanation as separate tasks.',['open-weights','ethics'],['qwen25coder'],'released'),
      n('qwq','QwQ','2024-2025','sourcePort','Qwen','qwen25','QwQ explored a reasoning-oriented branch before Qwen3 hybrid thinking.','Compare dedicated reasoning with Qwen3 selectable thinking modes.',['open-weights','reasoning'],['qwen3'],'released'),
      n('deepseekcoder','DeepSeek-Coder','2023-present','sourcePort','DeepSeek','deepseek','DeepSeek-Coder is the specialist programming branch.','Measure generated-code correctness with tests rather than style impressions.',['open-weights','ethics'],['deepseekr1'],'active branch'),
      n('deepseekv32','DeepSeek-V3.2','2025','engine','DeepSeek','deepseekv31','V3.2 followed V3.1 in December 2025.','Pin API or checkpoint versions when evaluating rapid release lines.',['open-weights','reasoning'],['deepseek32'],'released'),
      n('deepseekvision','DeepSeek-V4 Flash Vision Experimental','2026','tool','DeepSeek','deepseekv4','An experimental vision-capable V4 Flash branch was announced in August 2026.','Keep experimental models out of critical workflows until lifecycle and evaluation are clear.',['current','open-weights','ethics'],['deepseekv4vision'],'experimental')
    ],
    links: [
      ['o3','gpt5','unified-into','GPT-5 combines routed fast and deeper reasoning behaviours.'],
      ['gemma3','llama4','compare-open-weights','Contemporary multimodal open-weight families.'],
      ['qwen25coder','deepseekcoder','compare-code-models','Specialist open-weight code branches.'],
      ['qwq','deepseekr1','compare-reasoning','Contemporary open reasoning branches.'],
      ['sonnet5','gpt56terra','peer-tier','Contemporary balanced hosted models.']
    ]
  });

  applyExpansion(esports, {
    presets: [
      {id:'circuits', title:'Publisher and multi-title circuits', description:'Compare VCT, ALGS, Rainbow Six, CDL, fighting-game tours and EWC by governance, qualification and title ownership.', tag:'current', view:'force'},
      {id:'platforms-integrity', title:'Platforms and competitive integrity', description:'Trace ladders, tournament platforms, anti-cheat, eligibility, officials, evidence and appeals across a credible competition.', tag:'ethics', view:'layered'},
      {id:'people-welfare', title:'Teams, careers and player welfare', description:'Map playing, coaching, management, content, community, safeguarding and welfare responsibilities within a sustainable team.', tag:'l3-u1', view:'radial'}
    ],
    sources: [
      s('ewc2026','Esports World Cup 2026 competitions','https://esportsworldcup.com/en/competitions/2026','Official multi-title competition listing.'),
      s('ewc-rules','EWC 2026 competitive operations','https://resources.esportsworldcup.com/en/competitive-ops','Official global and per-title rule resources.'),
      s('algs','Apex Legends Global Series','https://algs.ea.com/','Official ALGS Year 6 portal.'),
      s('r6','Rainbow Six competition hub','https://www.ubisoft.com/en-gb/esports/rainbow-six/siege/competition-hub','Official Ubisoft competition portal.'),
      s('cdl','Call of Duty League','https://callofdutyleague.com/','Official CDL scores, schedules and competition portal.'),
      s('cpt','Capcom Pro Tour','https://sf.esports.capcom.com/cpt/','Official Street Fighter esports circuit.'),
      s('twt','Tekken World Tour','https://tekkenworldtour.com/','Official Tekken competition circuit.'),
      s('faceit','FACEIT','https://www.faceit.com/','Competitive platform and tournament service.'),
      s('nuel','University esports from NUEL','https://thenuel.com/','UK university esports community and competition pathway.'),
      s('worldskills','British Esports and WorldSkills UK','https://britishesports.org/the-hub/press-releases/british-esports-worldskills-uk-next-generation-esports-leaders/','Current education and employability pathway example.')
    ],
    nodes: [
      n('multi-title','Multi-title Festivals and Circuits','2010s-present','family','Multi-title','root','Multi-title events aggregate separate games, rulebooks and publishers into one event or club narrative.','Compare per-title competition with cross-title club scoring and identify governance conflicts.',['l3-u1','l3-u5','enterprise'],['ewc2026','ewc-rules'],'active'),
      n('ewc','Esports World Cup','2024-present','engine','Multi-title','multi-title','EWC combines many title tournaments with a cross-title Club Championship.','Audit title ownership, qualification and club scoring using current official rules.',['current','l3-u1','l3-u5','enterprise'],['ewc2026','ewc-rules'],'current circuit'),
      n('ewc-clubs','EWC Club Championship','2024-present','tool','Multi-title','ewc','Clubs earn points across multiple title tournaments within the wider event.','Model how specialist and multi-title clubs face different strategic incentives.',['current','l3-u5','enterprise'],['ewc2026'],'current competition'),
      n('publisher-circuits','Additional Publisher Circuits','2010s-present','family','Publisher circuits','root','Publisher circuits translate intellectual-property control into formal competitive pathways.','Compare three circuits by openness, region, team size and championship structure.',['l2-u1','l3-u1','l3-u5'],['algs','r6','cdl'],'active'),
      n('algs','Apex Legends Global Series','2019-present','engine','Publisher circuits','publisher-circuits','ALGS is EA’s official Apex Legends global competition circuit.','Map online qualification, regional competition and global LAN stages.',['current','l2-u1','l3-u5'],['algs'],'current season'),
      n('r6-esports','Rainbow Six Esports','2016-present','engine','Publisher circuits','publisher-circuits','Ubisoft’s Rainbow Six ecosystem includes regional and international competition pathways.','Use the current competition hub to separate challenger and top-tier stages.',['current','l2-u1','l3-u5'],['r6'],'current season'),
      n('cdl','Call of Duty League','2020-present','engine','Publisher circuits','publisher-circuits','CDL is the official franchised Call of Duty competition league.','Investigate how annual game releases affect rules, practice and audience continuity.',['current','l2-u1','l3-u1','enterprise'],['cdl'],'current league'),
      n('fighting-circuits','Fighting Game Circuits','1990s-present','sourcePort','Publisher circuits','publisher-circuits','Fighting-game esports combines publisher tours, open brackets, community majors and ranking points.','Compare open-bracket access with closed or qualification-led structures.',['l2-u1','l3-u1','l3-u5'],['cpt','twt'],'active ecosystem'),
      n('cpt','Capcom Pro Tour','2014-present','tool','Publisher circuits','fighting-circuits','CPT is Capcom’s official Street Fighter circuit leading to Capcom Cup.','Trace regional qualification and explain the role of World Warrior events.',['current','l2-u1','l3-u5'],['cpt'],'current circuit'),
      n('twt','Tekken World Tour','2017-present','tool','Publisher circuits','fighting-circuits','TWT is Bandai Namco’s official Tekken competition circuit.','Compare points-based qualification with direct event qualification.',['current','l2-u1','l3-u5'],['twt'],'current circuit'),
      n('platforms','Competitive Platforms','2000s-present','family','Platforms','root','Ladders and tournament platforms provide accounts, matchmaking, anti-cheat, brackets and administration.','Identify what a platform controls compared with a publisher or event operator.',['l2-u1','l3-u1','l3-u5','enterprise'],['faceit'],'active'),
      n('faceit','FACEIT platform','2012-present','engine','Platforms','platforms','FACEIT provides competitive matchmaking and tournament infrastructure within EFG.','Design a small tournament workflow using check-in, seeding, reporting and dispute tools.',['l2-u1','l3-u5','enterprise'],['faceit','efg'],'active platform'),
      n('ranked-ladders','Ranked ladders','ongoing','tool','Platforms','platforms','In-game or third-party ladders create persistent rating and qualification pathways.','Compare Elo-like ratings with tournament placement as evidence of performance.',['l2-u1','l3-u1'],['faceit'],'competition mechanism'),
      n('anti-cheat','Anti-cheat and account integrity','ongoing','tool','Platforms','platforms','Competitive platforms combine technical detection, identity controls and human review.','Create an appeals process that balances evidence, privacy and competitive integrity.',['l3-u1','l3-u5','ethics'],['ewc-rules'],'integrity function'),
      n('education-more','Education and Skills Pathways','2010s-present','sourcePort','Education','grassroots','Qualifications, competitions, employer projects and skills programmes can form distinct progression routes.','Map curriculum evidence to a competition, portfolio and employability outcome.',['l3-u1','enterprise'],['pearson-l3','worldskills'],'active pathway'),
      n('nuel','NUEL','2010-present','tool','Education','nse','NUEL is another UK university esports community and competition pathway.','Compare NUEL and NSE provision without assuming identical eligibility or titles.',['l2-u1','l3-u1'],['nuel','nse'],'active'),
      n('worldskills-path','WorldSkills esports leadership pathway','2026','tool','Education','education-more','British Esports and WorldSkills UK created a current skills-focused opportunity linked to Level 3 study and enterprise knowledge.','Identify the portfolio evidence a learner could reuse across curriculum and employability contexts.',['current','enterprise','l3-u1'],['worldskills'],'current programme'),
      n('team-business','Team Organisation Functions','ongoing','sourcePort','People','people','Teams require business, performance, content and welfare functions beyond the playing roster.','Draw an organisation chart for a small team and identify roles that must be combined.',['l3-u1','enterprise'],['pearson-l3'],'active function'),
      n('team-manager','Team manager','ongoing','tool','People','team-business','Managers coordinate schedules, travel, registration, communication and player support.','Build a tournament-week checklist separating logistics from coaching.',['l3-u1','enterprise','l3-u5'],['pearson-l3'],'active role'),
      n('content-creator','Content creator','ongoing','tool','People','team-business','Creators convert competitive activity into audience-facing stories and sponsor inventory.','Turn one match into live, short-form and long-form content with distinct objectives.',['enterprise','l3-u1'],['pearson-l3'],'active role'),
      n('community-manager','Community manager','ongoing','tool','People','team-business','Community managers moderate spaces, publish updates and feed audience insight back to the organisation.','Create an escalation policy and response-time standard for a team community.',['enterprise','ethics'],['pearson-l3'],'active role'),
      n('player-welfare','Player welfare and safeguarding','ongoing','tool','People','team-business','Welfare includes workload, sleep, travel, mental health, safeguarding and reporting routes.','Add welfare controls to a training and travel schedule.',['l3-u1','ethics'],['worldskills'],'support function'),
      n('venue','Venue and Stage','ongoing','sourcePort','Competition','events-ops','Venue delivery covers power, networking, stage, audience flow, accessibility and safety.','Produce a site survey that separates assumptions from verified capacity.',['l3-u5'],['pearson-l3'],'event function'),
      n('hardware-ops','Hardware and peripheral operations','ongoing','tool','Competition','events-ops','Competition stations require standardised images, accounts, peripherals, spares and reset procedures.','Create a station turnover checklist with fault-isolation steps.',['l3-u5'],['pearson-l3'],'event function'),
      n('ticketing','Ticketing and audience operations','ongoing','tool','Commercial','commercial','Ticketing links capacity, pricing, access control, safeguarding and customer experience.','Calculate break-even attendance and design an accessible entry process.',['enterprise','l3-u5'],['pearson-l3'],'commercial function'),
      n('merch','Merchandise and licensing','ongoing','tool','Commercial','commercial','Merchandise monetises identity but introduces inventory, fulfilment, rights and sustainability risks.','Compare print-on-demand with stocked inventory using margin and risk.',['enterprise'],['pearson-l3'],'commercial function'),
      n('media-rights','Media and distribution rights','ongoing','tool','Commercial','commercial','Rights agreements determine who may broadcast, clip, localise or monetise competition footage.','Draft a rights matrix for live, VOD, highlights, co-streaming and classroom use.',['enterprise','l3-u5','ethics'],['ewc-rules'],'commercial control'),
      n('data-analytics','Audience and performance analytics','ongoing','tool','Commercial','commercial','Viewership, engagement, conversion and game data inform decisions but require valid definitions and responsible use.','Turn one objective into a metric, data source, limitation and decision threshold.',['enterprise','ethics'],['pearson-l3'],'analytical function')
    ],
    links: [
      ['ea','algs','rights-holder','EA owns Apex Legends and the ALGS competition.'],
      ['ubisoft_root','r6-esports','rights-holder','Ubisoft owns Rainbow Six and its official competition ecosystem.'],
      ['fighting-circuits','ewc','title-events','Fighting-game circuits can connect to multi-title events.'],
      ['faceit','efg','owned-by','FACEIT is part of ESL FACEIT Group.'],
      ['media-rights','broadcast','governs','Media rights constrain broadcast and clipping activity.'],
      ['data-analytics','sponsors','measures','Analytics support sponsorship evaluation.'],
      ['player-welfare','players','supports','Welfare systems support sustainable player participation.']
    ]
  });

  applyExpansion(broadcast, {
    presets: [
      {id:'codecs-delivery', title:'Codecs and adaptive delivery', description:'Compare H.264, HEVC and AV1, then trace encoding, renditions, HLS, CDN delivery and adaptive playback.', tag:'networking', view:'timeline'},
      {id:'ip-production', title:'Professional media over IP', description:'Locate NDI, Dante, SMPTE ST 2110, PTP, SRT, RIST and WebRTC within LAN production and WAN contribution contexts.', tag:'networking', view:'layered'},
      {id:'accessible-secure', title:'Accessible and secure broadcasting', description:'Audit captions, graphics, loudness, moderation, rights, credentials and post-event evidence as production controls.', tag:'ethics', view:'force'}
    ],
    sources: [
      s('smpte2110','SMPTE ST 2110 standards suite','https://www.smpte.org/standards/st2110','Primary professional media-over-IP standards overview.'),
      s('webrtc','W3C WebRTC','https://www.w3.org/TR/webrtc/','Primary real-time browser communications specification.'),
      s('av1','Alliance for Open Media: AV1','https://aomedia.org/specifications/av1/','Primary AV1 specification information.'),
      s('ffmpeg','FFmpeg','https://ffmpeg.org/','Primary multimedia framework project.'),
      s('vmix','vMix','https://www.vmix.com/','Official live production software information.'),
      s('dante','Audinate Dante','https://www.getdante.com/','Official networked audio technology information.'),
      s('wcag22','W3C WCAG 2.2','https://www.w3.org/TR/WCAG22/','Primary accessibility standard.'),
      s('rist','RIST Forum','https://www.rist.tv/','Reliable Internet Stream Transport information and profiles.')
    ],
    nodes: [
      n('physical-video','HDMI and SDI video','ongoing','tool','Sources','game-source','Physical baseband connections carry uncompressed video with format, distance and connector constraints.','Document resolution, frame rate, colour, cable length and adapter risk for each run.',['l2-u3','l3-u6','troubleshoot'],['elgato'],'active interface'),
      n('sync','Genlock and reference sync','ongoing','tool','Sources','sources','Shared timing helps cameras and production systems switch cleanly and remain aligned.','Explain when a frame synchroniser can substitute for shared reference and what latency it adds.',['l3-u6','networking','troubleshoot'],['smpte2110'],'production control'),
      n('remote-guest','Remote guests and contribution','ongoing','tool','Sources','sources','Remote presenters add browser, return-video, echo, network and consent requirements.','Create a guest technical check and fallback contact path.',['l3-u6','troubleshoot'],['webrtc'],'active source'),
      n('audio-network','Networked audio','ongoing','sourcePort','Capture','capture','Audio-over-IP can separate routing from physical point-to-point cabling.','Create a channel, clock, multicast and permission plan before connecting devices.',['l3-u6','networking','troubleshoot'],['dante','smpte2110'],'active technology'),
      n('dante','Dante audio network','ongoing','engine','Capture','audio-network','Dante provides networked audio routing and device-management workflows.','Trace clock leader, transmitter, receiver and subscription for one commentary channel.',['l3-u6','networking','troubleshoot'],['dante'],'active technology'),
      n('st2110','SMPTE ST 2110','2017-present','sourcePort','Capture','capture','ST 2110 transports separate professional video, audio and ancillary-data essences over managed IP networks.','Compare ST 2110 facility transport with SRT contribution over the public internet.',['l3-u6','networking'],['smpte2110'],'active standards suite'),
      n('ptp','Precision timing and PTP','ongoing','tool','Capture','st2110','Professional IP media systems use precise shared timing for aligned essences and switching.','Identify the grandmaster, timing domain and failure behaviour in a network diagram.',['l3-u6','networking','troubleshoot'],['smpte2110'],'network control'),
      n('vmix','vMix','ongoing','sourcePort','Production','production','vMix is an alternative software production environment with switching, graphics, replay and remote-contribution functions.','Compare OBS and vMix against the same functional requirements rather than feature count alone.',['l3-u6'],['vmix'],'active software'),
      n('multiview','Multiview and confidence displays','ongoing','tool','Production','production','Multiviews combine preview, programme, sources, meters, clocks and status for operators.','Design a multiview that exposes the most dangerous failures at a glance.',['l3-u6','troubleshoot'],['obs','vmix'],'production control'),
      n('browser-graphics','Browser-source graphics','ongoing','tool','Production','overlays','HTML/CSS/JavaScript graphics can connect live data to overlays through a browser source.','Build a read-only data flow and validate escaping, dimensions and fallback state.',['l3-u6','software'],['obs'],'production method'),
      n('replay-system','Replay buffer and highlights','ongoing','tool','Production','observer-replay','Replay systems record recent feeds, mark events and return selected clips to programme.','Define operator cues and storage bandwidth for a two-angle replay.',['l3-u6'],['vmix','obs'],'production method'),
      n('recording','ISO and multitrack recording','ongoing','tool','Production','production','Isolated source and multitrack recordings enable repair, highlights and evidence but multiply storage and data duties.','Calculate storage for programme plus four isolated feeds and set a retention rule.',['l3-u6','troubleshoot'],['obs','vmix'],'production method'),
      n('codecs','Video Codec Families','ongoing','family','Codecs','root','Codecs trade compression efficiency, quality, compute, latency, compatibility and licensing.','Compare codecs at equivalent visual quality, hardware support and end-to-end latency.',['l2-u3','l3-u6','networking'],['av1','youtube-settings'],'active stage'),
      n('h264','H.264 / AVC','2003-present','engine','Codecs','codecs','H.264 remains a common live-streaming compatibility baseline.','Explain profile, level and hardware encoder support in a deployment decision.',['l2-u3','l3-u6','networking'],['youtube-settings'],'active codec'),
      n('h265','H.265 / HEVC','2013-present','engine','Codecs','h264','HEVC can improve compression efficiency but has compatibility and licensing considerations.','Check platform ingest and viewer playback support before selecting HEVC.',['l3-u6','networking'],['youtube-settings'],'active codec'),
      n('av1','AV1','2018-present','sourcePort','Codecs','codecs','AV1 is an open media codec designed for efficient internet video delivery.','Measure encoder speed, device decode support and bitrate savings on the same clip.',['l3-u6','networking'],['av1'],'active codec'),
      n('ffmpeg','FFmpeg processing','2000-present','tool','Encoding','encoding','FFmpeg provides command-line encoding, decoding, filtering, packaging and protocol tools.','Create a reproducible transcode command and verify output with probe data.',['l3-u6','software','troubleshoot'],['ffmpeg'],'active tool'),
      n('rist','RIST contribution','2018-present','sourcePort','Transport','transport','RIST profiles provide interoperable reliable contribution across lossy IP networks.','Compare packet recovery, encryption and interoperability requirements with SRT.',['l3-u6','networking','troubleshoot'],['rist'],'active protocol'),
      n('webrtc','WebRTC contribution','2011-present','sourcePort','Transport','transport','WebRTC supports interactive low-latency browser communication with negotiation and network traversal.','Explain why interactive latency and broadcast scale need different delivery paths.',['l3-u6','networking','troubleshoot'],['webrtc'],'active protocol'),
      n('vlan-qos','VLANs, multicast and QoS','ongoing','tool','Transport','connectivity','Managed production networks use segmentation and traffic controls to protect media and control flows.','Design VLAN and QoS intent without claiming it can create bandwidth that does not exist.',['l3-u6','networking','troubleshoot'],['ndi','smpte2110'],'network control'),
      n('cdn','Content delivery network','ongoing','tool','Distribution','distribution','CDNs replicate or cache viewer delivery close to audiences and absorb large request volumes.','Explain why contribution upload capacity and viewer distribution scale are different problems.',['l3-u6','networking'],['hls'],'platform function'),
      n('abr','Adaptive bitrate logic','ongoing','tool','Distribution','transcoding','Players select among renditions based on throughput, buffer, device and policy.','Interpret a rendition-switch timeline and distinguish congestion from encoder failure.',['l3-u6','networking','troubleshoot'],['hls'],'platform function'),
      n('captions','Live captions and accessibility','ongoing','tool','Audience','audience','Captions, readable graphics, audio description and accessible interaction widen access and may be required by policy.','Test caption accuracy, delay, speaker identification and graphics contrast.',['l3-u6','ethics'],['wcag22','smpte2110'],'accessibility control'),
      n('loudness','Loudness and true-peak control','ongoing','tool','Audience','audience','Consistent programme loudness and peak control reduce listener fatigue and platform distortion.','Measure speech, game and final programme rather than mixing only by ear.',['l3-u6','troubleshoot'],['obs'],'quality control'),
      n('security','Broadcast security','ongoing','tool','Audience','archive-rights','Stream keys, remote-control interfaces, browser sources and accounts create attack paths.','Threat-model credential theft, malicious overlays and unauthorised restreaming.',['l3-u6','networking','ethics'],['twitch-broadcast','youtube-encoder'],'governance control'),
      n('postmortem','Technical post-event review','ongoing','tool','Audience','analytics','Logs, recordings, incidents and audience data support systematic improvement.','Write one evidence-based cause, correction, owner and verification test per incident.',['l2-u3','l3-u6','troubleshoot'],['pearson-l2','pearson-l3'],'review process')
    ],
    links: [
      ['remote-guest','webrtc','contributes-via','Remote guests commonly use interactive real-time contribution.'],
      ['dante','audio-mix','feeds','Network audio is routed into the programme mix.'],
      ['st2110','production','feeds','Managed-IP media feeds professional production systems.'],
      ['browser-graphics','overlays','renders','Browser sources render data-driven graphics.'],
      ['codecs','software-encode','implemented-by','Software encoders implement codec choices.'],
      ['codecs','hardware-encode','implemented-by','Hardware blocks implement supported codecs.'],
      ['ffmpeg','hls','packages','FFmpeg can package compatible media for HLS workflows.'],
      ['rist','distribution','ingest-to','RIST contribution terminates at a compatible platform or gateway.'],
      ['transcoding','cdn','distributed-through','Packaged renditions are delivered through CDN infrastructure.'],
      ['captions','hls','packaged-with','Caption tracks can accompany adaptive delivery.'],
      ['postmortem','production','improves','Post-event evidence informs production changes.']
    ]
  });
}

export function expandStoredDatasets(root){
  const webPath = path.join(root, 'data', 'lineages', 'web-platform.json');
  const web = JSON.parse(fs.readFileSync(webPath, 'utf8').replace(/^\uFEFF/, ''));
  applyExpansion(web, {
    presets: [
      {id:'accessibility', title:'Accessible web foundations', description:'Trace WCAG 1.0 to 2.2, then test semantic HTML, keyboard focus, target size, contrast and reduced motion in a real interface.', tag:'accessibility', view:'timeline'},
      {id:'web-security', title:'Web security foundations', description:'Connect origins, CORS, CSP, TLS and HTTP semantics. Threat-model trust boundaries rather than treating HTTPS as complete security.', tag:'security', view:'layered'},
      {id:'media-compute', title:'Browser media and compute APIs', description:'Compare WebGL, WebGPU, WebRTC, WebCodecs and WebNN by capability, compatibility, privacy and fallback.', tag:'web-apps', view:'force'}
    ],
    sources: [
      s('wcag22','W3C Web Content Accessibility Guidelines 2.2','https://www.w3.org/TR/WCAG22/','Current W3C Recommendation for web accessibility.'),
      s('web-components','HTML Standard: custom elements','https://html.spec.whatwg.org/multipage/custom-elements.html','Primary custom-elements standard.'),
      s('indexeddb','W3C Indexed Database API 3.0','https://www.w3.org/TR/IndexedDB-3/','Primary browser database specification.'),
      s('webrtc','W3C WebRTC','https://www.w3.org/TR/webrtc/','Primary real-time browser communications specification.'),
      s('webgl','Khronos WebGL','https://www.khronos.org/webgl/','Primary WebGL standard and conformance information.'),
      s('webcodecs','W3C WebCodecs','https://www.w3.org/TR/webcodecs/','Low-level media codec API specification.'),
      s('webnn','W3C Web Neural Network API','https://www.w3.org/TR/webnn/','WebNN specification checked 2026-09-01.'),
      s('css-contain','W3C CSS Containment Level 3','https://www.w3.org/TR/css-contain-3/','Container-query specification.'),
      s('view-transitions','W3C CSS View Transitions Level 2','https://www.w3.org/TR/css-view-transitions-2/','Cross-document view-transition specification.'),
      s('tls13','IETF RFC 8446: TLS 1.3','https://www.rfc-editor.org/rfc/rfc8446','Primary TLS 1.3 specification.'),
      s('http-semantics2','IETF RFC 9110: HTTP Semantics','https://www.rfc-editor.org/rfc/rfc9110','Current HTTP semantics specification.'),
      s('csp3','W3C Content Security Policy Level 3','https://www.w3.org/TR/CSP3/','Primary Content Security Policy specification.')
    ],
    nodes: [
      n('accessibility','Accessibility Standards','1999-present','family','Accessibility','root','Accessible web content depends on semantic platform features, author practice and testable guidance.','Audit one page with automated checks, keyboard use and a screen reader, then separate tool findings from human judgement.',['core','standards','accessibility'],['wcag22'],'active standards'),
      n('wcag1','WCAG 1.0','1999','engine','Accessibility','accessibility','WCAG 1.0 established early W3C web-accessibility guidance.','Compare technology-specific checkpoints with later principle-based criteria.',['history','standards','accessibility'],['wcag22'],'superseded recommendation'),
      n('wcag20','WCAG 2.0','2008','engine','Accessibility','wcag1','WCAG 2.0 organised testable criteria around perceivable, operable, understandable and robust principles.','Map one barrier to principle, guideline and success criterion.',['standards','accessibility'],['wcag22'],'superseded recommendation'),
      n('wcag21','WCAG 2.1','2018','engine','Accessibility','wcag20','WCAG 2.1 added criteria addressing mobile, low vision and cognitive accessibility.','Identify which new criterion addresses a mobile interaction barrier.',['standards','accessibility'],['wcag22'],'superseded recommendation'),
      n('wcag22','WCAG 2.2','2023','engine','Accessibility','wcag21','WCAG 2.2 is the current W3C Recommendation in this lineage.','Test a focus-appearance or target-size criterion on the atlas interface.',['core','standards','accessibility'],['wcag22'],'current recommendation'),
      n('component-platform','Component and Application APIs','2011-present','family','Application APIs','root','Modern web applications combine component encapsulation, storage, graphics, media and device APIs.','Choose APIs from requirements and check compatibility, permission, security and fallback.',['web-apps','standards'],['web-components','indexeddb'],'living ecosystem'),
      n('web-components','Web Components','2011-present','engine','Application APIs','component-platform','Custom elements, shadow DOM and templates support browser-native reusable components.','Build a custom element and explain its lifecycle and encapsulation boundary.',['web-apps','standards'],['web-components'],'living standards'),
      n('custom-elements','Custom Elements','2016-present','tool','Application APIs','web-components','Custom elements let authors define new HTML element behaviour.','Implement observed attributes and test upgrade timing.',['web-apps'],['web-components'],'living standard'),
      n('shadow-dom','Shadow DOM','2015-present','tool','Application APIs','web-components','Shadow DOM creates an encapsulated component tree with defined style and event behaviour.','Investigate which styles and events cross the shadow boundary.',['web-apps'],['web-components'],'living standard'),
      n('indexeddb','IndexedDB 3.0','2018-present','engine','Application APIs','component-platform','IndexedDB provides transactional structured storage in the browser.','Design keys and indexes for an offline dataset and handle failed transactions.',['web-apps','data'],['indexeddb'],'current specification'),
      n('webrtc','WebRTC','2011-present','engine','Application APIs','component-platform','WebRTC provides real-time media and data communication between browsers and compatible endpoints.','Trace signalling, ICE, media transport and application logic as separate concerns.',['web-apps','protocol'],['webrtc'],'current standard'),
      n('webgl','WebGL','2011-present','engine','Application APIs','component-platform','WebGL exposes GPU-accelerated graphics through a browser API based on OpenGL ES concepts.','Separate graphics API, shader language, canvas and GPU driver responsibilities.',['web-apps','graphics'],['webgl'],'active standard'),
      n('webgl2','WebGL 2','2017-present','engine','Application APIs','webgl','WebGL 2 expands browser graphics capabilities over the first version.','Check required extensions and fallback before using a feature.',['web-apps','graphics'],['webgl'],'active standard'),
      n('webcodecs','WebCodecs','2021-present','engine','Application APIs','component-platform','WebCodecs exposes low-level audio and video encoding or decoding primitives to web applications.','Explain why container parsing, transport and rendering remain separate tasks.',['web-apps','media'],['webcodecs'],'current draft'),
      n('webnn','WebNN','2021-present','sourcePort','Application APIs','component-platform','WebNN defines a hardware-agnostic graph API for neural-network inference in web applications.','Assess support, privacy, model size and fallback before proposing client-side inference.',['web-apps','current','ethics'],['webnn'],'current candidate specification'),
      n('modern-css','Modern Responsive CSS','2017-present','sourcePort','CSS','css-modules','Modern CSS adds component-aware queries and navigation transition primitives beyond viewport media queries.','Choose layout or transition features based on content and reduced-motion requirements.',['core','web-apps','standards'],['css-contain','view-transitions'],'active modules'),
      n('container-queries','Container Queries','2022-present','tool','CSS','modern-css','Container queries let component styles respond to a containing element rather than only the viewport.','Refactor a component from viewport breakpoints to container conditions.',['core','web-apps'],['css-contain'],'active standard'),
      n('view-transitions','View Transitions','2023-present','tool','CSS','modern-css','View Transition APIs coordinate visual changes within and across eligible documents.','Provide a reduced-motion path and justify which state changes should animate.',['web-apps','accessibility'],['view-transitions'],'active standard'),
      n('security-platform','Web Security Foundations','1994-present','family','Security','root','Origin boundaries, transport security and content policy constrain how web resources interact.','Threat-model data in transit, cross-origin access, injected script and credential storage separately.',['protocol','standards','security'],['tls13','csp3'],'active standards'),
      n('same-origin','Same-origin policy','1995-present','engine','Security','security-platform','The same-origin model restricts how documents and scripts from different origins interact.','Classify scheme, host and port for several URLs before predicting access.',['web-apps','security'],['csp3'],'platform security model'),
      n('cors','Cross-Origin Resource Sharing','2009-present','tool','Security','same-origin','CORS adds HTTP-based permission signals for selected cross-origin requests.','Trace a preflight and avoid treating CORS as authentication.',['protocol','security'],['http-semantics2'],'living standard'),
      n('csp','Content Security Policy','2012-present','tool','Security','same-origin','CSP limits permitted content sources and can reduce impact from injection vulnerabilities.','Start with report-only policy, inspect violations and tighten without breaking required content.',['web-apps','security'],['csp3'],'current specification'),
      n('tls12','TLS 1.2','2008','engine','Security','security-platform','TLS 1.2 protected HTTP and other application protocols across a long deployment period.','Separate encryption, identity validation and application authentication.',['protocol','security'],['tls13'],'widely deployed'),
      n('tls13','TLS 1.3','2018','engine','Security','tls12','TLS 1.3 simplified the protocol and removed obsolete cryptographic options.','Compare handshake flow and downgrade protection with TLS 1.2.',['protocol','security'],['tls13'],'current standard'),
      n('http-semantics','HTTP Semantics RFC 9110','2022','tool','HTTP','http3','RFC 9110 consolidates HTTP method, status, field and representation semantics independently of a transport version.','Explain why HTTP/3 changes transport without redefining GET or 404.',['protocol','standards'],['http-semantics2'],'current standard')
    ],
    links: [
      ['html-living','web-components','defines','Custom elements and templates integrate with the HTML Standard.'],
      ['javascript','custom-elements','controls','JavaScript defines custom-element behaviour.'],
      ['css-modules','shadow-dom','styles','CSS participates in shadow-tree styling and encapsulation.'],
      ['webrtc','webcodecs','media-integration','Low-level codecs can support advanced real-time media applications.'],
      ['webgpu','webnn','compute-backend','Both expose hardware-accelerated computation through constrained web APIs.'],
      ['tls13','http3','secures','HTTP/3 uses TLS 1.3 within QUIC.'],
      ['cors','fetch','governs','Fetch applies cross-origin request rules.'],
      ['csp','html-living','constrains','CSP constrains resources used by an HTML document.'],
      ['wcag22','html-living','implemented-through','Semantic HTML is one foundation for accessible conformance.']
    ]
  });
  fs.writeFileSync(webPath, `${JSON.stringify(web, null, 2)}\n`);

  const gamePath = path.join(root, 'data', 'lineages', 'game-engines.json');
  const game = JSON.parse(fs.readFileSync(gamePath, 'utf8').replace(/^\uFEFF/, ''));
  applyExpansion(game, {
    presets: [
      {id:'education-engines', title:'Accessible engines and frameworks', description:'Compare Godot, Bevy, Defold, Phaser, MonoGame, Roblox Studio and other accessible tools by workflow, language, licence and deployment.', tag:'education', view:'radial'},
      {id:'open-source', title:'Open-source engine ecosystems', description:'Trace source releases, reimplementations and community engines while distinguishing licence, code lineage and API compatibility.', tag:'open source', view:'force'}
    ],
    sources: [
      s('bevy','Bevy Engine','https://bevyengine.org/','Official open-source Rust game engine site.'),
      s('defold','Defold','https://defold.com/','Official cross-platform game engine site.'),
      s('phaser','Phaser','https://phaser.io/','Official HTML5 game framework site.'),
      s('monogame','MonoGame','https://monogame.net/','Official open-source .NET game framework site.'),
      s('roblox-studio','Roblox Studio','https://create.roblox.com/docs/studio','Official Roblox creation documentation.'),
      s('godot-releases','Godot release policy and archive','https://godotengine.org/download/archive/','Official Godot release archive.'),
      s('marvel-rivals','Unreal Engine: Marvel Rivals','https://www.unrealengine.com/en-US/developer-interviews/marvel-rivals-pushes-the-limits-of-hero-shooters-with-unreal-engine-5','Official Epic developer interview confirming Unreal Engine 5 use.')
    ],
    nodes: [
      n('bevy_root','Bevy Engine lineage','2020-present','family','Bevy','accessible_engines_root','Bevy is a data-driven open-source engine written in Rust.','Compare entity-component-system architecture with an object-oriented scene hierarchy.',['open source','education','Rust','current'],['bevy'],'active'),
      n('bevy_engine','Bevy','2020-present','engine','Bevy','bevy_root','Bevy uses an ECS-focused architecture and a rapid pre-1.0 release cadence.','Pin a version and inspect migration guides before using tutorials.',['open source','Rust','indie'],['bevy'],'active development'),
      n('defold_root','Defold lineage','2016-present','family','Defold','accessible_engines_root','Defold is a free source-available cross-platform engine using Lua scripting.','Compare licence terminology, editor workflow and export targets with Godot.',['indie','Lua','cross-platform'],['defold'],'active'),
      n('defold_engine','Defold','2016-present','engine','Defold','defold_root','Defold combines a component model, Lua scripting and multi-platform build service.','Prototype the same 2D behaviour in Defold and another educational engine.',['indie','Lua','education'],['defold'],'active'),
      n('phaser_root','Phaser lineage','2013-present','family','Phaser','accessible_engines_root','Phaser is an HTML5 game framework for browser games.','Distinguish a framework from a complete editor-led engine.',['HTML5','JavaScript','education'],['phaser'],'active'),
      n('phaser3','Phaser 3','2018-present','engine','Phaser','phaser_root','Phaser 3 is the established modern framework line.','Trace scene, input, asset and rendering responsibilities in a small browser game.',['HTML5','JavaScript','2D'],['phaser'],'active'),
      n('monogame_root','MonoGame lineage','2009-present','family','MonoGame','accessible_engines_root','MonoGame is an open-source implementation of the Microsoft XNA 4 framework APIs.','Explain API reimplementation without claiming inherited proprietary source code.',['open source','C#','education'],['monogame'],'active'),
      n('xna4','Microsoft XNA 4','2010','engine','MonoGame','monogame_root','XNA 4 provided the API baseline later implemented by MonoGame.','Identify framework services a developer must still build into a full game architecture.',['C#','historical','framework'],['monogame'],'discontinued'),
      n('monogame','MonoGame','2009-present','sourcePort','MonoGame','xna4','MonoGame carries XNA-style development across modern platforms.','Port a small XNA-style sample and document platform-specific changes.',['open source','C#','cross-platform'],['monogame'],'active'),
      n('roblox_root','Roblox creation platform','2006-present','family','Roblox','root','Roblox combines a proprietary engine, hosted platform, editor, marketplace and live-service ecosystem.','Separate engine, platform, creator tools, distribution and monetisation.',['platform','UGC','education','current'],['roblox-studio'],'active platform'),
      n('roblox_studio','Roblox Studio','2006-present','engine','Roblox','roblox_root','Roblox Studio is the creation environment for experiences deployed to Roblox.','Audit client/server script placement and platform dependency in a prototype.',['UGC','Lua','education'],['roblox-studio'],'active tool'),
      n('godot45','Godot 4.5','2025','engine','Godot','godot_4','Godot 4.5 continued the 4.x engine line with an official stable release.','Use the archive to distinguish stable, maintenance and development builds.',['open source','current','education'],['godot-releases'],'released'),
      n('godot46','Godot 4.6','2026','engine','Godot','godot45','Godot 4.6 is a current 2026 release line in the official archive.','Check project upgrade notes and keep a recoverable copy before migration.',['open source','current','education'],['godot-releases'],'current stable'),
      n('marvel_rivals','Marvel Rivals','2024','game','Epic','ue5','Marvel Rivals is a competitive hero shooter developed with Unreal Engine 5.','Compare engine capability with the separate networking, design and live-operations work of the game team.',['esports','hero shooter','UE5','current'],['marvel-rivals'],'current esports title')
    ],
    links: [
      ['lua54','defold_engine','scripting-language','Defold uses Lua as its scripting language.'],
      ['csharp14','monogame','programming-language','MonoGame commonly uses C#.'],
      ['javascript','phaser3','programming-language','Phaser applications are commonly written in JavaScript or TypeScript.']
    ]
  });
  fs.writeFileSync(gamePath, `${JSON.stringify(game, null, 2)}\n`);
}
