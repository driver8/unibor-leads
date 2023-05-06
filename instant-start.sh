while [[ true ]]; do
	npm run start &> instant.log ;
	echo "$! started";
	wait "$!";
	sleep 3s;
	echo "restart";
done;
