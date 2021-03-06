var ActionChatInbox = React.createClass({
    propTypes: {
        user: React.PropTypes.object,
        friends: React.PropTypes.array,
        messages: React.PropTypes.array,
        online: React.PropTypes.bool,
        all_users: React.PropTypes.array
    },

    getInitialState: function() {
        return ({online: this.props.online, room: "nil", friends: this.props.friends, group_chats: []});
    },

    componentWillMount: function() {
        // Connect to your individual room
        this.connectToCable();
        // Set Group Chats
        this.setGroupChats();
        // Create global functions that will be used by ActionCable channels
        window.CreateIndividualMessage = this.createIndividualMessage;
        window.CreateGroupChat = this.createGroupChat;
    },

    componentDidMount: function() {
        this.openAllChats();
    },

    render: function() {
        return (
            <div id="actionChatInbox">
            <div className="row">
            <div className="medium-12 columns">
            <div id="friendsList">
            <div id="actions">
            <a onClick={this.openNewMessage} id="newMessage">New Message</a>
            </div>
            {this.friendsList()}
            </div>
            <div id="conversation">
            {this.state.activeChats}
            </div>
            </div>
            </div>
            </div>
        );
    },

    // Non-React Methods

    getOnlineStatus: function(online) {
        var status = online
        ? "online"
        : "offline";
        return (<span id="onlineStatus" className={status}></span>);
    },

    openIndividualMessage: function(u) {
        $("#conversation").children().hide();

        $(".room_channel_" + u.id).show();

        $("#messageList.room_channel_" + u.id).scrollTop(99999);
    },

    openGroupChat: function(gc) {
        $("#conversation").children().hide();

        $(".room_channel_group_" + gc.id).show();

        $("#messageList.room_channel_group_" + gc.id).scrollTop(99999);
    },

    openNewMessage: function(event) {

        event.stopPropagation();

        $("#groupChat").hide();
        $("#individualMessage").hide();
        $("#newMessageBox").show();

    },

    connectToCable: function() {
        CreateMySubscription(this.props.user);
    },

    subToGroupChat: function(gc) {
        SubscribeToGroupChat(this.props.user, gc);
    },

    friendsList: function() {
        var friendsList = [];
        var _this = this;
        this.state.friends.forEach(function(user, index) {
            friendsList.push(
                <div key={user.id} id="friend" onClick={function(){_this.openIndividualMessage(user)}}>{_this.getOnlineStatus(user.online)} <div id="userName"> {user.email} </div> <a href="#" onClick={_this.removeFriend.bind(null, user)} id="removeFriend">&#215;</a></div>
            );
        });
        if (this.state.friends.length == 0 && this.state.group_chats.length == 0) {
            friendsList.push(
                <div id="groupChatLabel">No Friends or Group Chats</div>
            );
        }
        if (this.state.group_chats.length > 0) {
            friendsList.push(
                <div id="groupChatLabel">Group Chats</div>
            );
        }
        friendsList.push(this.groupChats());
        return friendsList;
    },

    toggleFriendsList: function() {
        $("#friendsList").toggle();
    },

    toggleMessage: function(e) {
        $("#individualMessage").hide();
        $(e.target).nextAll("#messageList").toggle();
        $(e.target).nextAll("#messageForm").toggle();
    },

    closeMessage: function(u) {
        var chats = this.state.activeChats;
        var user_index;
        chats.forEach(function(obj, index) {
            if(obj.props.user.id == u.id) {
                user_index = index;
            }
        });
        // Remove from array
        chats.splice(user_index, 1);
        this.setState({activeChats: chats});
    },

    hideMessage: function(room) {
        $("." + room).hide();
    },

    openAllChats: function() {
        var chats = [];
        var _this = this;
        var messages = this.props.messages;
        // New Message
        chats.push(<NewMessage current_user={_this.props.user} all_users={_this.props.all_users} createIndividualMessage={_this.createIndividualMessage} />);
        // Individual Chats
        this.state.friends.forEach(function(u) {
            var messages_to_user = messages.filter(function(message) {
                return (message.author == _this.props.user.id && message.room ==  "" + u.id) || (message.author == u.id && message.room == "" + _this.props.user.id);
            });
            chats.push(<IndividualMessage current_user={_this.props.user} all_users={_this.props.all_users} key={u.id} user={u} toggleMessage={_this.toggleMessage} closeMessage={_this.hideMessage} messages={messages_to_user}/>);
        });
        // Group Chats
        this.state.group_chats.forEach(function(gc) {
            var messages_to_user = messages.filter(function(message) {
                return (message.room == "group_" + gc.id);
            });
            chats.push(<GroupChat current_user={_this.props.user} all_users={_this.props.all_users} key={gc.id} groupChat={gc} toggleMessage={_this.toggleMessage} closeMessage={_this.hideMessage} messages={messages_to_user}/>);
        });
        this.setState({activeChats: chats});
    },

    createIndividualMessage: function(u) {
        var chats = this.state.activeChats;
        var _this = this;
        var messages = this.props.messages;
        var messages_to_user = messages.filter(function(message) {
            return (message.author == _this.props.user.id && message.room == "" + u.id) || (message.author == u.id && message.room == "" + _this.props.user.id);
        });
        var unique_chats = chats.filter(function(chat) {
            if (chat.props.user) {
                return (chat.props.user.id != u.id);
            } else {
                return 1;
            }
        });
        this.addFriend(u);
        unique_chats.push(<IndividualMessage current_user={_this.props.user} all_users={_this.props.all_users} key={u.id} user={u} toggleMessage={_this.toggleMessage} closeMessage={_this.hideMessage} addToChat={_this.addToChat} messages={messages_to_user} />);
        $("#newMessageBox").hide();
        this.setState({activeChats: unique_chats});
    },

    createGroupChat: function(gc) {
        console.log(gc);
        var messages = this.props.messages;
        var chats = this.state.group_chats;
        var _this = this;
        chats.push(gc);
        this.setState({group_chats: chats});
        this.openAllChats();
    },

    removeFriend: function(u, event) {
        event.stopPropagation();
        var friends = this.state.friends;
        var newFriends = [];
        this.hideMessage("room_channel_" + u.id);
        friends.forEach(function(f){
            if (f.id != u.id) {
                newFriends.push(f);
            }
        });
        this.setState({friends: newFriends});
        $.ajax({
            method: "POST",
            url: "/users/remove_friend/" + u.id
        });
    },

    removeFromGroupChat: function(gc, event) {
        event.stopPropagation();
        var group_chats = this.state.group_chats;
        var newGroupChats = [];
        this.hideMessage("room_channel_group_" + gc.id);
        group_chats.forEach(function(g){
            if (g.id != gc.id) {
                newGroupChats.push(g);
            }
        });
        this.setState({group_chats: newGroupChats});
        $.ajax({
            method: "POST",
            url: "/users/remove_from_group_chat/" + gc.id
        });
    },

    addFriend: function(u) {
        var friends = this.state.friends;
        friends.push(u);
        this.setState({friends: friends});
    },

    setGroupChats: function() {
        var group_chats = [];
        var _this = this;
        this.props.group_chats.forEach(function(gc){
            gc.users.forEach(function(u){
                if (u.id == _this.props.user.id) {
                    group_chats.push(gc);
                    _this.subToGroupChat(gc);
                }
            });
        });
        this.setState({group_chats: group_chats});
    },

    groupChats: function() {
        var group_chats = [];
        var _this = this;

        this.state.group_chats.forEach(function(gc){
            group_chats.push(
                <div key={gc.id} id="group_chat" onClick={function(){_this.openGroupChat(gc)}}><div id="userName"> {gc.id} </div> <a href="#" onClick={_this.removeFromGroupChat.bind(null, gc)} id="removeFriend">&#215;</a></div>
            );
        });

        return group_chats;

    },


});
