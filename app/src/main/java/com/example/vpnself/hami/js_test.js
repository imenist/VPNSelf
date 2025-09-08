function openwxCall(){
  console.log("gogogo");
	var target = id("kbq").className("android.view.View").text("搪胶GOGOGO").findOne(800);
	while(target == null){
    console.log("target == null");
    scrollDown(0);
    target = id("kbq").className("android.view.View").text("搪胶GOGOGO").findOne(800);
  }
	var targetParent =target.parent();
	var targetParentClassName = targetParent.className();
  while(targetParentClassName != "android.widget.ListView"){
		target =targetParent
		targetParent =targetParent.parent()
		targetParentClassName=targetParent.className()
  }
	target.click()
	sleep(500)

	var bottomAddBtn = id("bjz").findone(1000)
	bottomAddBtn.click()
	sleep(1000)
	console.log("====="+id("a11").findone(1000).parent().parent().parent().parent().parent().className());
  var pzBounds = text("拍摄").findone(1000).parent().bounds();
	click(pzBounds.centerX(),pzBounds.centerY());
}
openwxCall();