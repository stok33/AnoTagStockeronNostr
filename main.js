const currUnixtime = () => Math.floor(new Date().getTime() / 1000);

//searchPostsの処理
const searchPosts = async () => {
    //公開鍵をhtmlの入力欄から取得
    const npubInput = document.getElementById("npubInput");
    let npub = npubInput.value;

    //取得したnpubをnip19よりhexに変換
    const { type, data } = NostrTools.nip19.decode(npub);
	switch (type) {
        case "npub":
            npub = data;
            break;
  		case "nprofile":
            npub = data.pubkey;
    		break;
  		case "nsec":
            console.error("Do not enter nsec!!");
            alert("秘密鍵は秘密にしておいて！(npub~の方を入力)");
  		default:
            console.error("Please enter public key(npub~)");
            alert("何の文字列かわからない…(npub~のやつを入力)");
            break;
	}
    //タグを入力欄から取得
    const tagInput = document.getElementById("tagInput");
    const tag = tagInput.value;
    //リレーURLを入力欄から取得
    const relayInput = document.getElementById("relayInput");
    const relayUrl = relayInput.value;


  /* Q-1: nostr-toolsのRelayオブジェクトを初期化してみよう */
    const relay = NostrTools.relayInit(relayUrl);
    relay.on("error", () => {
        console.error("failed to connect");
    });

  /* Q-2: Relayオブジェクトのメソッドを呼び出して、リレーに接続してみよう */
    await relay.connect(relayUrl);

  /* Q-3: Relayオブジェクトのメソッドを使って、イベントを購読してみよう */
  //kind0を購読
    const sub0 = relay.sub([
                            {
                                "kinds":[0],
                                "authors":[npub]
                            }

  ]);
  //kind1にフィルターつけて購読
    const sub = relay.sub([
                           {
                               "kinds": [1], //kind1イベントを取ってくるよ
                               "limit": 100, //イベントの上限は100個まで
                               "#t":[tag], //取得したハッシュタグを指定
                               "authors": [npub] // 取得した公開鍵を指定
	
    }
  ]);
  
    const profContainer = document.getElementById("profContainer");
    profContainer.innerHTML = ""; // コンテナをクリア
    
    const illustContainer = document.getElementById("illustContainer");
    illustContainer.innerHTML = ""; // コンテナをクリア

    // メッセージタイプごとにリスナーを設定できる
  
    //kind0の方
    sub0.on("event", (pf) => {
        console.log(pf);

    try {
        const profcontent = JSON.parse(pf.content); // eventJSON文字列をオブジェクトに変換
        const profpicture = profcontent.picture;//content内のpictureの値を取得
        const profdisplayname = profcontent.display_name; // content内のdisplay_nameの値を取得
        const profname = profcontent.name; // content内のnameの値を取得
        const profabout = profcontent.about; // content内のaboutの値を取得
        console.log(profname);
      
        // プロフィールを表示するための要素を作成
        const kind0Container = document.createElement("div");
      
        // プロフィールを表示するための部分にアイコンとdisplay_nameとnameと自己紹介を追加
        //アイコン
        const imageElement = document.createElement("img");
        imageElement.src = profpicture;
        imageElement.style.maxWidth = "100px"; // 最大幅制限
        imageElement.style.height = "auto"; // 高さは自動調整
        kind0Container.appendChild(imageElement);  // プロフィールを表示する要素に追加
        //display_name　表示名
        const displaynameElement = document.createElement("div");
        displaynameElement.textContent = profdisplayname;
        kind0Container.appendChild(displaynameElement); // プロフィールを表示する要素に追加
        //name　アットマークの後
        const nameElement = document.createElement("div");
        nameElement.textContent = profname;
        kind0Container.appendChild(nameElement); // プロフィールを表示する要素に追加
        //自己紹介欄
        const aboutElement = document.createElement("div");
        aboutElement.textContent = profabout;
        kind0Container.appendChild(aboutElement); // プロフィールを表示する要素に追加

        // 全部まとめてプロフィールコンテナに追加
        profContainer.appendChild(kind0Container);
    } catch (err) {
      console.error(err);
    }
  });



    sub0.on("eose", () => {
        console.log("****** EOSE ******");
    });

    //kind1の方
　   sub.on("event", (ev) => {
        console.log(ev);

     try {
        const content = ev.content; // contentタグの内容を取得
        const Id = ev.id // idタグの内容（ここではnoteid）を取得
        const tags = ev.tags; // tags配列を取得

        // contentタグ内に直リンクの画像URLがあるかチェック
        const imgRegex = /https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp)/g;
        const imgMatches = [...content.matchAll(imgRegex)];
        console.log(imgMatches);
        
        // センシティブなコンテンツのチェック
        const isSensitive = tags.some(tag => tag[0] === 'content-warning');

	//idからnoteid, neventに変換
	const noteId = NostrTools.nip19.noteEncode(Id); //noteidをnote~形式に直す
	    console.log("noteId:", noteId);
     　 const nevent = NostrTools.nip19.neventEncode({id: Id}); //neventに直す
	    console.log("nevent:", nevent);
	     
        // 投稿を表示するための要素を作成
        const postContainer = document.createElement("div");
      
        //ラジオボタン要素を取得
        const displayOptionRadio = document.querySelectorAll('input[name="displayOption"]');

         //　ラジオボタンの選択によってselectedValueにhtmlのラジオボタン要素のvalueの値allかimagesを割り当て
         const selectedValue = document.querySelector('input[name="displayOption"]:checked').value;

            
             
                switch (selectedValue) {
                // すべての投稿を表示　＝　selectedValueの値がallのとき
                    case 'all':
                        // センシティブなコンテンツの場合の処理
                        if (isSensitive) {
                            let sensitiveContentClicked = false; // 初期値はクリックされていない状態
                            const sensitiveContent = document.createElement("div");
                            const sensitiveText = document.createElement("div");
                            sensitiveText.textContent = "[content-warning！閲覧するにはクリック]";
                            sensitiveText.style.cursor = "pointer"; // カーソルをポインターに変更
                            sensitiveContent.appendChild(sensitiveText);
                            
                            // 理由表示
                            const reasonTag = tags.find(tag => tag[0] === 'content-warning');
                            if (reasonTag && reasonTag[1]) {
                                const reasonElement = document.createElement("div");
                                reasonElement.textContent = `理由: ${reasonTag[1]}`;
                                sensitiveContent.appendChild(reasonElement);
                            }
                            
                            
                            // クリックイベントを設定
                            sensitiveContent.addEventListener("click", () => {
                                if (!sensitiveContentClicked) { // クリックは一回まで！クリックしてない場合のみ処理が行われる
                                    sensitiveContentClicked = true; // クリック状態をtrueに設定
                                    // クリック時の処理：画像を表示する
                                    sensitiveContent.innerHTML = ''; // テキストをクリア
                                    
                                    
                                    // 画像を表示するための要素を作成
                                    for (const match of imgMatches) {
                                        const SensitiveimageUrl = match[0];
                                        
                                        
                                        // 画像を表示するための要素を作成
                                        const Sensitiveimage = document.createElement("img");
                                        Sensitiveimage.src = SensitiveimageUrl;
                                        //画像の調整
                                        Sensitiveimage.style.maxWidth = "auto";
                                        Sensitiveimage.style.height = "300px";
                                        //画像をpostContainerに追加
                                        postContainer.appendChild(Sensitiveimage);
                                    }
                                    
                                    // テキストコンテンツを表示するための要素を作成
                                    const Sensitivetext = document.createElement("div");
                                    // 不要なURLを削除してテキストを設定
                                    Sensitivetext.textContent = content.replace(imgRegex, "");
                                    // テキスト部分を投稿表示のための要素 postContainer に追加
                                    sensitiveContent.appendChild(Sensitivetext);
                                    
                                    ///nevent→nostterのリンク
            			  const neventElement = document.createElement("a"); 
	　　			　　neventElement.href = `https://nostter.app/${nevent}`; 
	　　			　　neventElement.textContent = "投稿をみる(nostter)"; 
	　　			　　neventElement.target = "_blank"; 
	　　			　　postContainer.appendChild(neventElement); 
                                }
                                
                            });
                            // 投稿コンテナにセンシティブ投稿を追加
                            postContainer.appendChild(sensitiveContent);
                            
                            
                        // センシティブでないコンテンツの場合
                        }else {
                            // 画像を表示するための要素を作成
                            for (const match of imgMatches) {
                                const imageUrl = match[0];
                                
                                // 画像を表示するための要素を作成
                                const imageElement = document.createElement("img");
                                imageElement.src = imageUrl;
                                //画像の調整
                                imageElement.style.maxWidth = "auto";
                                imageElement.style.height = "300px";
                                //画像をpostContainerに追加
                                postContainer.appendChild(imageElement);
                            }
                            
                            
                            // テキストコンテンツを表示するための要素を作成
                            const textContainer = document.createElement("div");
                            // 不要なURLを削除してテキストを設定
                            textContainer.textContent = content.replace(imgRegex, "");
                            //テキスト部分を投稿表示のための要素postContainerに追加
                            postContainer.appendChild(textContainer);
                            
                           ///nevent→nostterのリンク
            			  const neventElement = document.createElement("a"); 
	　　			　　neventElement.href = `https://nostter.app/${nevent}`; 
	　　			　　neventElement.textContent = "投稿をみる(nostter)"; 
	　　			　　neventElement.target = "_blank"; 
	　　			　　postContainer.appendChild(neventElement); 
                         }
                     break;
                        
            // 画像付きのみを表示 = selectedValueの値がimagesのとき
            case 'images':
                
                     switch (true) {
                             // センシティブなコンテンツの場合の処理
                         case isSensitive && imgMatches.length > 0:
                             let sensitiveContentClicked = false; // 初期値はクリックされていない状態
                             const sensitiveContent = document.createElement("div");
                             const sensitiveText = document.createElement("div");
                             sensitiveText.textContent = "[content-warning！閲覧するにはクリック]";
                             sensitiveText.style.color = "red"; // テキストの色を赤に設定
                             sensitiveText.style.cursor = "pointer"; // カーソルをポインターに変更
                             sensitiveContent.appendChild(sensitiveText);
                             
                             // 理由表示
                             const reasonTag = tags.find(tag => tag[0] === 'content-warning');
                             if (reasonTag && reasonTag[1]) {
                                 const reasonElement = document.createElement("div");
                                 reasonElement.textContent = `理由: ${reasonTag[1]}`;
                                 reasonElement.style.color = "red"; // テキストの色を赤に設定
                                 sensitiveContent.appendChild(reasonElement);
                             }
                             
                             
                             // クリックイベントを設定
                             sensitiveContent.addEventListener("click", () => {
                                 if (!sensitiveContentClicked) { // クリックは一回まで！クリックしてない場合のみ処理が行われる
                                     sensitiveContentClicked = true; // クリック状態をtrueに設定
                                     // クリック時の処理：画像を表示する
                                     sensitiveContent.innerHTML = ''; // テキストをクリア
                                     
                                     
                                     // 画像を表示するための要素を作成
                                     for (const match of imgMatches) {
                                         const SensitiveimageUrl = match[0];
                                         
                                         // 画像を表示するための要素を作成
                                         const Sensitiveimage = document.createElement("img");
                                         Sensitiveimage.src = SensitiveimageUrl;
                                         //画像の調整
                                         Sensitiveimage.style.maxWidth = "auto";
                                         Sensitiveimage.style.height = "300px";
                                         //画像をpostContainerに追加
                                         postContainer.appendChild(Sensitiveimage);
                                     }
                                     
                                     // テキストコンテンツを表示するための要素を作成
                                     const Sensitivetext = document.createElement("div");
                                     // 不要なURLを削除してテキストを設定
                                     Sensitivetext.textContent = content.replace(imgRegex, "");
                                     // テキスト部分を投稿表示のための要素 postContainer に追加
                                     sensitiveContent.appendChild(Sensitivetext);
                                     
                                     ///nevent→nostterのリンク
            			  const neventElement = document.createElement("a"); 
	　　			　　neventElement.href = `https://nostter.app/${nevent}`; 
	　　			　　neventElement.textContent = "投稿をみる(nostter)"; 
	　　			　　neventElement.target = "_blank"; 
	　　			　　postContainer.appendChild(neventElement); 
                                 }
                                 
                             });
                             // 投稿コンテナにセンシティブ投稿を追加
                             postContainer.appendChild(sensitiveContent);
                             
                             break;
                             
                             // センシティブでないコンテンツで画像付きの場合
                         case !isSensitive && imgMatches.length > 0:
                             
                             // 画像を表示するための要素を作成
                             for (const match of imgMatches) {
                                 const imageUrl = match[0];
                                 
                                 // 画像を表示するための要素を作成
                                 const imageElement = document.createElement("img");
                                 imageElement.src = imageUrl;
                                 //画像の調整
                                 imageElement.style.maxWidth = "auto";
                                 imageElement.style.height = "300px";
                                 //画像をpostContainerに追加
                                 postContainer.appendChild(imageElement);
                             }
                             
                             
                             // テキストコンテンツを表示するための要素を作成
                             const textContainer = document.createElement("div");
                             // 不要なURLを削除してテキストを設定
                             textContainer.textContent = content.replace(imgRegex, "");
                             //テキスト部分を投稿表示のための要素postContainerに追加
                             postContainer.appendChild(textContainer);
                             
                           ///nevent→nostterのリンク
            			  const neventElement = document.createElement("a"); 
	　　			　　neventElement.href = `https://nostter.app/${nevent}`; 
	　　			　　neventElement.textContent = "投稿をみる(nostter)"; 
	　　			　　neventElement.target = "_blank"; 
	　　			　　postContainer.appendChild(neventElement); 
                             
                             
                             //画像なしの場合、なにもしない
                         default:
                     }
                        
                    break;
                    
                default:
 
            
                }
                    

                                
         //postContainerを一つの投稿表示欄illustContainerに追加
         illustContainer.appendChild(postContainer);
         //境界線追加
         illustContainer.appendChild(document.createElement("hr"));
         
     } catch (err) {
      console.error(err);
    }


  sub.on("eose", () => {
    console.log("****** EOSE ******");
  });
 });
           
};
